import { GamepadManager } from './gamepadManager.js';

GamepadManager.init();

// --- Funciones para manejar systemState con sessionStorage ---
function loadSystemState() {
  const storedState = sessionStorage.getItem('appSystemState');
  if (storedState) {
    try {
      return JSON.parse(storedState);
    } catch (e) {
      console.error("Error parsing systemState from sessionStorage:", e);
      // Si hay un error, volver a los valores por defecto
    }
  }
  // Valores por defecto si no hay nada almacenado o hay error
  return {
    pythonRunning: false,
    navigationLock: false,
    gamepad: {
      lastButton1: false,
      lastButton2: false,
    },
  };
}

function saveSystemState() {
  try {
    sessionStorage.setItem('appSystemState', JSON.stringify(systemState));
  } catch (e) {
    console.error("Error saving systemState to sessionStorage:", e);
  }
}

// --- Estados del sistema (cargados desde sessionStorage o por defecto) ---
let systemState = loadSystemState();

// --- Lógica para desbloquear la navegación al cargar una página si estaba bloqueada ---
if (systemState.navigationLock) {
  console.log("Navigation lock was active on page load. Deactivating after a short delay.");
  setTimeout(() => {
    // Volver a verificar, por si otra lógica lo cambió mientras tanto
    if (systemState.navigationLock) {
      console.log("Deactivating navigation lock from page load timeout.");
      systemState.navigationLock = false;
      saveSystemState();
    }
  }, 250); // Un pequeño retardo para permitir que la página se "asiente"
}


// Sistema de supervisión
let pythonWatchdog = null;

function monitorPythonProcess() {
  if (!systemState.pythonRunning) return;

  pythonWatchdog = setInterval(async () => {
    if (systemState.pythonRunning) {
      const isAlive = await window.api.checkPythonAlive();
      if (!isAlive && systemState.pythonRunning) {
        handlePythonCrash();
      }
    } else {
      if (pythonWatchdog) clearInterval(pythonWatchdog);
      pythonWatchdog = null;
    }
  }, 2000);
}

if (systemState.pythonRunning) {
  console.log("Python was running (from sessionStorage), re-initiating monitor.");
  monitorPythonProcess();
}


function handlePythonCrash() {
  console.error('Python se cerró inesperadamente');
  if (pythonWatchdog) clearInterval(pythonWatchdog);
  pythonWatchdog = null;
  systemState.pythonRunning = false;
  saveSystemState();

  if (!isOnPage('index.html')) {
    navigateTo('index.html');
  }
}

// --- FUNCIÓN handleGamepadInput MODIFICADA ---
function handleGamepadInput() {
  const gamepad = GamepadManager.getActiveGamepad('right');
  if (!gamepad?.buttons) {
    requestAnimationFrame(handleGamepadInput);
    return;
  }

  // 1. Leer los botones actuales del gamepad
  const currentButtonStates = getButtonStates(gamepad);
  const actualButton1 = currentButtonStates.button1;
  const actualButton2 = currentButtonStates.button2;

  // 2. Obtener el estado 'last' de los botones del systemState (que vino de sessionStorage o del frame anterior)
  const prevLastButton1 = systemState.gamepad.lastButton1;
  const prevLastButton2 = systemState.gamepad.lastButton2;

  // 3. Actualizar systemState.gamepad.lastButtonX con los estados ACTUALES de los botones
  //    Esto es lo que se guardará para el próximo frame o la próxima carga de página.
  let gamepadStateChanged = false;
  if (systemState.gamepad.lastButton1 !== actualButton1) {
    systemState.gamepad.lastButton1 = actualButton1;
    gamepadStateChanged = true;
  }
  if (systemState.gamepad.lastButton2 !== actualButton2) {
    systemState.gamepad.lastButton2 = actualButton2;
    gamepadStateChanged = true;
  }

  // 4. Guardar systemState si el estado de los botones cambió
  //    Esto se hace ANTES de la lógica de navegación.
  if (gamepadStateChanged) {
    saveSystemState();
  }

  // 5. Lógica de navegación: usar actualButtonX y prevLastButtonX
  if (!systemState.navigationLock) {
    // Lógica para el botón 1 (Navegación principal contextual)
    if (isButtonPressed(actualButton1, prevLastButton1)) {
      navigateTo("game.html")
    }
    // Lógica para el botón 2 (Python App)
    else if (isButtonPressed(actualButton2, prevLastButton2)) { // Compara actual con el 'last' del inicio del frame
      togglePythonApp();
    }
    // Condición de fallback
    else if (shouldReturnToIndex()) {
      navigateTo('index.html');
    }
    if(!actualButton1&&!actualButton2){
      navigateTo('index.html');
    }
  }

  requestAnimationFrame(handleGamepadInput);
}
// --- FIN DE FUNCIÓN handleGamepadInput MODIFICADA ---

// Helper functions
function getButtonStates(gamepad) {
  return {
    button1: gamepad.buttons[1]?.pressed || false,
    button2: gamepad.buttons[2]?.pressed || false,
  };
}

function isButtonPressed(current, last) {
  return current && !last;
}

function isOnPage(pageName) {
  const currentPath = window.location.pathname;
  const normalizedTargetPage = (pageName.startsWith('/') ? pageName.substring(1) : pageName).toLowerCase();
  const normalizedCurrentPath = currentPath.toLowerCase();

  if (normalizedTargetPage === 'index.html' && (normalizedCurrentPath === '/' || normalizedCurrentPath.endsWith('/index.html') || normalizedCurrentPath.endsWith('index.html'))) {
    return true;
  }
  return normalizedCurrentPath.endsWith(normalizedTargetPage);
}

function shouldReturnToIndex() {
  return !systemState.pythonRunning &&
    !isOnPage('index.html') &&
    !isOnPage('game.html');
}

async function togglePythonApp() {
  console.log("Toggling Python app. Locking navigation.");
  systemState.navigationLock = true;
  saveSystemState(); // Guardar el bloqueo

  try {
    if (systemState.pythonRunning) {
      await window.api.stopPythonApp();
      systemState.pythonRunning = false;
      if (pythonWatchdog) clearInterval(pythonWatchdog);
      pythonWatchdog = null;
      saveSystemState(); // Guardar estado de Python
    } else {
      await window.api.runPythonApp();
      systemState.pythonRunning = true;
      saveSystemState(); // Guardar estado de Python
      monitorPythonProcess();
    }
  } catch (error) {
    console.error("Error toggling Python app:", error);
    systemState.pythonRunning = false; // Asumir que falló
    if (pythonWatchdog) clearInterval(pythonWatchdog);
    pythonWatchdog = null;
    saveSystemState(); // Guardar el estado de error
    if (!isOnPage('index.html')) {
      navigateTo('index.html');
    }
  } finally {
    console.log("Python app toggle finished. Unlocking navigation after delay.");
    setTimeout(() => {
      if (systemState.navigationLock) {
        systemState.navigationLock = false;
        saveSystemState();
      }
    }, 150);
  }
}

function navigateTo(page) {
  if (isOnPage(page)) {
    console.log(`Ya estás en ${page}. No se navega.`);
    if (systemState.navigationLock) {
      systemState.navigationLock = false;
      saveSystemState();
    }
    return;
  }

  console.log(`Navegando a ${page}. Bloqueando navegación.`);
  systemState.navigationLock = true;
  // No es necesario guardar el estado de los botones aquí, ya se hizo en handleGamepadInput ANTES de llamar a navigateTo.
  // Solo guardamos el cambio del navigationLock.
  saveSystemState();

  window.location.href = page;
}

// Iniciar sistema
handleGamepadInput();