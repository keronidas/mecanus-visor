import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

const api = {
  runPythonApp: () => ipcRenderer.invoke('run-python-app'),
  stopPythonApp: () => ipcRenderer.invoke('stop-python-app'),
  checkPythonAlive: () => ipcRenderer.invoke('check-python-alive'),
  enviarComandoUDP: (comando) => ipcRenderer.invoke('enviar-comando-udp', comando),
  // Añade esto para mantener la conexión
  onPythonStatusChange: (callback) => {
    ipcRenderer.on('python-status-change', (event, status) => callback(status));
  }
};

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}