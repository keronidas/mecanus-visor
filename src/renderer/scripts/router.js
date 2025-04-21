export function navigateTo(page) {
    window.electron.ipcRenderer.send('navigate-to', page);
  }