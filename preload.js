const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  call: (ch, ...args) => ipcRenderer.invoke(ch, ...args),
  on: (ch, fn) => ipcRenderer.on(ch, (_e, data) => fn(data)),
});

// Lets the CSS make room for macOS traffic lights (left) instead of Windows/Linux caption buttons (right).
window.addEventListener('DOMContentLoaded', () => document.body.classList.add(process.platform));
