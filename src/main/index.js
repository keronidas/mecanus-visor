import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
const { exec } = require('child_process')
const path = require('path');
const os = require('os');

// Configuración de rutas
const pythonDir = path.join(os.homedir(), 'Documents', 'entornos', 'mi_entorno', 'aplicacionfeindef');
const pythonScript = 'integrado_V8.py'

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 180,
    fullscreen: true,
    show: true,
    frame: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.webContents.openDevTools()
  mainWindow.maximize()
  mainWindow.setBounds({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })

  // Manejo del comando Python mejorado
  ipcMain.handle('run-python-app', async () => {
    return new Promise((resolve, reject) => {
      // 1. Verificar existencia del directorio Python
      const fs = require('fs');
      if (!fs.existsSync(pythonDir)) {
        const errorMsg = `Directorio Python no encontrado: ${pythonDir}`;
        console.error('[Python]', errorMsg);
        dialog.showErrorBox('Error Python', errorMsg);
         return reject(errorMsg);
      }
  
      // 2. Construcción del comando mejorada
      let command, shellOption;
      try {
        if (process.platform === 'win32') {
          command = `cd /d "${pythonDir}" venv/Script/activate && python ${pythonScript}`;
          shellOption = 'cmd.exe';
        } else {
          command = `cd "${pythonDir}" && source venv/bin/activate && python ${pythonScript}`;
          console.log(command)
          shellOption = '/bin/bash';
        }
  
        console.log('[Python] Comando completo:', command);
  
        // 3. Ejecución con mejor manejo de streams
        const pythonProcess = exec(command, { 
          shell: shellOption,
          cwd: pythonDir, // Establecer directorio de trabajo
          maxBuffer: 1024 * 1024 * 5 // 5MB buffer
        }, (error, stdout, stderr) => {
          if (error) {
            const errorMsg = `Error: ${error.message}`;
            console.error('[Python]', errorMsg);
            dialog.showErrorBox('Error Python', errorMsg);
            return reject(errorMsg);
          }
          if (stderr) {
            console.warn('[Python] Advertencias:', stderr);
            // No rechazar solo por stderr (algunos scripts escriben en stderr normalmente)
          }
          console.log('[Python] Resultado:', stdout);
          resolve(stdout || "Script ejecutado (sin salida)");
        });
  
        // 4. Manejo de eventos mejorado
        pythonProcess.stdout.on('data', (data) => {
          console.log('[Python] Salida:', data.toString());
        });
  
        pythonProcess.stderr.on('data', (data) => {
          console.warn('[Python] Error stream:', data.toString());
        });
  
        pythonProcess.on('exit', (code) => {
          console.log(`[Python] Proceso terminado con código: ${code}`);
          if (code !== 0) {
            reject(`Proceso terminado con código ${code}`);
          }
        });
  
      } catch (setupError) {
        console.error('[Python] Error en configuración:', setupError);
        reject(`Error en configuración: ${setupError.message}`);
      }
    });
  });

  // Resto de tu configuración...
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
