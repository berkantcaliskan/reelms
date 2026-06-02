const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('reelmsUpdater', {
    onStatus(callback) {
        ipcRenderer.on('updater:status', (_event, text) => {
            callback(text)
        })
    },

    onProgress(callback) {
        ipcRenderer.on('updater:progress', (_event, percent) => {
            callback(percent)
        })
    }
})