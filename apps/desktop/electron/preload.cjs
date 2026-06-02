const { contextBridge, ipcRenderer } = require('electron')

function on(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

contextBridge.exposeInMainWorld('reelms', {
  platform: process.platform,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  openGoogleAuth: () => ipcRenderer.invoke('auth:google-open'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateAvailable: (callback) => on('updates:available', callback),
  onUpdateDownloaded: (callback) => on('updates:downloaded', callback),
  onAuthCode: (callback) => on('auth:code', callback)
})
