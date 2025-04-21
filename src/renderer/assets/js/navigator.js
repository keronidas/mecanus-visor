// assets/js/navigator.js
const { ipcRenderer } = require('electron');

function navigateTo(page) {
  ipcRenderer.send('navigate', page);
}

// Opcional: Si necesitas usar esto desde el HTML
window.navigateTo = navigateTo;