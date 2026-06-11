const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetApi', {
  mode: process.argv.includes('--widget-mode') ? 'widget' : 'app',
  placeWidget: () => ipcRenderer.send('app:place-widget'),
  moveBy: (deltaX, deltaY) => ipcRenderer.send('widget:move-by', deltaX, deltaY),
  finishMove: () => ipcRenderer.send('widget:finish-move'),
  showDeleteMenu: () => ipcRenderer.send('widget:show-delete-menu'),
  removeWidget: () => ipcRenderer.send('widget:remove'),
  openApp: () => ipcRenderer.send('widget:open-app'),
  setSizePreset: (preset) => ipcRenderer.send('widget:set-size', preset),
  themeApplied: () => ipcRenderer.send('theme:applied'),
});
