import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn } from 'child_process'
const path = require('path')
const dgram = require('dgram')
const os = require('os')

// Configuración de rutas
const pythonDir = path.join(os.homedir(), 'Desktop', 'FEINDEF')
const pythonScript = 'integrado_V8.py'
let pythonProcessRef = null

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

  mainWindow.maximize()
  mainWindow.setBounds({
    x: 0,
    y: 0,
    width: 1920,
    height: 1080
  })
  // mainWindow.webContents.openDevTools()
  // Añadir estos manejadores IPC
  ipcMain.handle('check-python-alive', async () => {
    if (!pythonProcessRef) return false
    try {
      process.kill(pythonProcessRef.pid, 0)
      return true
    } catch {
      return false
    }
  })
  // Manejo del comando Python mejorado
  ipcMain.handle('run-python-app', async () => {
    return new Promise((resolve, reject) => {
      const fs = require('fs')
      if (!fs.existsSync(pythonDir)) {
        const errorMsg = `Directorio Python no encontrado: ${pythonDir}`
        console.error('[Python]', errorMsg)
        dialog.showErrorBox('Error Python', errorMsg)
        return reject(errorMsg)
      }

      let command, args

      if (process.platform === 'win32') {
        command = 'cmd.exe'
        args = ['/c', `cd /d "${pythonDir}" && venv\\Scripts\\activate && python ${pythonScript}`]
      } else {
        command = 'bash'
        args = ['-c', `cd "${pythonDir}" && echo "seom2" | sudo -S python3 ${pythonScript}`]
      }



      pythonProcessRef = spawn(command, args, {
        cwd: pythonDir,
        detached: true, // Considerar si detached es realmente necesario si la ventana principal no se cierra
        stdio: ['pipe', 'pipe', 'pipe'] // 'inherit' puede ser útil para debugging directo en la consola de Electron
      })

      // pythonProcessRef.unref(); // Si no es detached y quieres que Python muera con Electron, no uses unref.
      // Si quieres que Python siga si Electron cierra, detached y unref son correctos.

      pythonProcessRef.stdout.on('data', (data) => {
        console.log('[Python] STDOUT:', data.toString())
        // Podrías enviar esto al renderer si es útil: focusedWindow.webContents.send('python-stdout', data.toString());
      })

      pythonProcessRef.stderr.on('data', (data) => {
        console.error('[Python] STDERR:', data.toString())
        // focusedWindow.webContents.send('python-stderr', data.toString());
      })

      pythonProcessRef.on('close', (code) => {
        console.log(`[Python] Proceso terminado con código ${code}`)
        const oldPythonProcessRef = pythonProcessRef // Capturar la referencia actual
        pythonProcessRef = null

        // 👉 YA NO SE MUESTRA LA VENTANA (porque no se ocultó)
        // OJO: si python crashea y la ventana se cerró por otra razón, focusedWindow podría ser null.
        // const currentFocusedWindow = BrowserWindow.getFocusedWindow(); // Obtener la ventana actual por si cambió
        // if (currentFocusedWindow && oldPythonProcessRef) { // Asegurarse que hablamos de la ventana asociada a este proceso
        //    currentFocusedWindow.show();
        // }

        if (code !== 0) return reject(`Error código ${code}`)
        resolve('Script ejecutado correctamente')
      })

      pythonProcessRef.on('error', (err) => {
        console.error('[Python] Error del proceso:', err)
        // Aquí también, si la ventana fue ocultada, considerar mostrarla en caso de error al lanzar
        // const focusedWindow = BrowserWindow.getFocusedWindow();
        // if (focusedWindow) {
        //   focusedWindow.show();
        // }
        reject(err.message)
      })
    })
  })
  ipcMain.handle('enviar-comando-udp', async (event, comando) => {
    const client = dgram.createSocket('udp4')

    const HOST = '192.168.100.80' // Dirección IP destino
    const PORT = 5678 // Puerto destino

    const comandoHex = comando
    const buffer = Buffer.from(comandoHex, 'hex')

    client.send(buffer, 0, buffer.length, PORT, HOST, (err) => {
      if (err) {
        console.error('Error al enviar el comando UDP:', err)
      } else {
        console.log('Comando UDP enviado correctamente.')
      }
      client.close()
    })
  })
  ipcMain.handle('stop-python-app', async () => {
    return new Promise((resolve, reject) => {
      if (!pythonProcessRef) {
        return reject('No hay proceso Python en ejecución')
      }

      try {
        // Detener el proceso de manera más segura
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', pythonProcessRef.pid, '/f', '/t'])
        } else {
          process.kill(-pythonProcessRef.pid)
        }
        pythonProcessRef = null
        resolve('Proceso Python detenido correctamente')
      } catch (e) {
        console.error('[Python] Error al detener:', e)
        pythonProcessRef = null
        reject('No se pudo detener el proceso')
      }
    })
  })

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
