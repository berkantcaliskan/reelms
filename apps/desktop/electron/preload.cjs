const { contextBridge, ipcRenderer } = require('electron')

function on(channel, callback) {
  const listener = (_event, payload) => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const isDev = process.env.NODE_ENV === 'development'
const apiUrl = process.env.REELMS_API_URL || (isDev ? 'http://127.0.0.1:5000' : 'https://api.reelms.io')

const reelmsBridge = {
  platform: process.platform,
  isDesktop: true,
  apiUrl,
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  openGoogleAuth: () => ipcRenderer.invoke('auth:google-open'),
  setFullscreen: (enabled) => ipcRenderer.invoke('window:set-fullscreen', Boolean(enabled)),
  isFullscreen: () => ipcRenderer.invoke('window:is-fullscreen'),
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  onMaximizeChange: (callback) => on('window:maximize-change', callback),
  installUpdate: () => ipcRenderer.invoke('updates:install'),
  onUpdateAvailable: (callback) => on('updates:available', callback),
  onUpdateDownloaded: (callback) => on('updates:downloaded', callback),
  onAuthCode: (callback) => on('auth:code', callback),
  onGoogleAuth: (callback) => on('auth:code', callback),
  onActivityUpdate: (callback) => on('activity:update', callback),
  execControlEvent: (event) => ipcRenderer.invoke('remote-control:exec-event', event)
}

contextBridge.exposeInMainWorld('reelms', reelmsBridge)
contextBridge.exposeInMainWorld('electronAPI', reelmsBridge)
