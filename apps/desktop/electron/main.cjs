const path = require('node:path')
const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { autoUpdater } = require('electron-updater')

const PROTOCOL = 'reelms'
const DEV_RENDERER_URL = 'http://127.0.0.1:3105'

const isDev = !app.isPackaged
const useRemoteBackend = process.env.REELMS_USE_REMOTE_BACKEND === 'true'

const apiUrl = (
  process.env.REELMS_API_URL ||
  process.env.VITE_API_BASE_URL ||
  (isDev && !useRemoteBackend ? 'http://127.0.0.1:5000' : 'https://api.reelms.io')
).replace(/\/$/, '')

let mainWindow = null
let updaterWindow = null
let pendingAuthCode = null
let updateDownloaded = false

function getAssetPath(...parts) {
  return path.join(__dirname, '..', ...parts)
}

function createUpdaterWindow() {
  updaterWindow = new BrowserWindow({
    width: 440,
    height: 280,
    frame: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    show: false,
    backgroundColor: '#070812',
    icon: getAssetPath('build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'updater-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  updaterWindow.loadFile(path.join(__dirname, 'updater.html'))

  updaterWindow.once('ready-to-show', () => {
    if (updaterWindow && !updaterWindow.isDestroyed()) {
      updaterWindow.show()
    }
  })

  updaterWindow.on('closed', () => {
    updaterWindow = null
  })
}

function sendUpdaterStatus(text) {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.webContents.send('updater:status', text)
  }
}

function sendUpdaterProgress(percent) {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.webContents.send('updater:progress', percent)
  }
}

function closeUpdaterWindow() {
  if (updaterWindow && !updaterWindow.isDestroyed()) {
    updaterWindow.close()
  }

  updaterWindow = null
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: '#070812',
    title: 'Reelms',
    icon: getAssetPath('build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (isDev) {
    mainWindow.loadURL(DEV_RENDERER_URL)
  } else {
    mainWindow.loadFile(getAssetPath('dist', 'index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    closeUpdaterWindow()

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show()
    }

    if (pendingAuthCode && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('auth:code', pendingAuthCode)
      pendingAuthCode = null
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }
}

function handleDeepLink(rawUrl) {
  try {
    const url = new URL(rawUrl)

    if (url.protocol !== `${PROTOCOL}:`) return

    if (url.hostname === 'auth') {
      const code = url.searchParams.get('code')
      if (!code) return

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('auth:code', code)
      } else {
        pendingAuthCode = code
      }
    }
  } catch (err) {
    console.error('[deep-link] invalid url', rawUrl, err)
  }
}

function setupSingleInstanceLock() {
  const singleInstance = app.requestSingleInstanceLock()

  if (!singleInstance) {
    app.quit()
    return
  }

  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${PROTOCOL}://`))
    if (deepLink) handleDeepLink(deepLink)

    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

function setupProtocolHandler() {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [
        path.resolve(process.argv[1])
      ])
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL)
  }

  app.on('open-url', (event, url) => {
    event.preventDefault()
    handleDeepLink(url)
  })
}

function setupIpcHandlers() {
  ipcMain.handle('app:get-info', () => ({
    version: app.getVersion(),
    isPackaged: app.isPackaged,
    apiUrl
  }))

  ipcMain.handle('shell:open-external', (_event, url) => {
    return shell.openExternal(url)
  })

  ipcMain.handle('auth:google-open', () => {
    return shell.openExternal(`${apiUrl}/auth/google/login?platform=desktop`)
  })

  ipcMain.handle('window:set-fullscreen', (_event, enabled) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false
    mainWindow.setFullScreen(Boolean(enabled))
    return mainWindow.isFullScreen()
  })

  ipcMain.handle('window:is-fullscreen', () => {
    if (!mainWindow || mainWindow.isDestroyed()) return false
    return mainWindow.isFullScreen()
  })

  ipcMain.handle('updates:install', () => {
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(false, true)
    }
  })
}

function setupAutoUpdaterForMainWindow() {
  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('updates:available', info)
  })

  autoUpdater.on('update-downloaded', (info) => {
    updateDownloaded = true
    mainWindow?.webContents.send('updates:downloaded', info)
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('updates:progress', {
      percent: Math.round(progress.percent || 0)
    })
  })

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('updates:error', {
      message: err?.message || 'Update check failed'
    })
  })
}

async function runUpdateGate() {
  console.log(`[electron] Local backend is never started by desktop. apiUrl=${apiUrl}`)

  if (!app.isPackaged) {
    createWindow()
    return
  }

  createUpdaterWindow()

  let finished = false

  const continueToApp = () => {
    if (finished) return
    finished = true
    createWindow()
  }

  const failSafeTimer = setTimeout(() => {
    sendUpdaterStatus('Update check skipped. Starting Reelms...')
    setTimeout(continueToApp, 700)
  }, 10000)

  autoUpdater.autoDownload = true

  autoUpdater.on('checking-for-update', () => {
    sendUpdaterStatus('Checking for updates...')
    sendUpdaterProgress(8)
  })

  autoUpdater.on('update-not-available', () => {
    clearTimeout(failSafeTimer)
    sendUpdaterStatus('Reelms is up to date.')
    sendUpdaterProgress(100)

    setTimeout(continueToApp, 700)
  })

  autoUpdater.on('update-available', () => {
    clearTimeout(failSafeTimer)
    sendUpdaterStatus('New update found. Downloading...')
    sendUpdaterProgress(15)
  })

  autoUpdater.on('download-progress', (progress) => {
    const percent = Math.round(progress.percent || 0)
    sendUpdaterStatus(`Downloading update... ${percent}%`)
    sendUpdaterProgress(percent)
  })

  autoUpdater.on('update-downloaded', () => {
    clearTimeout(failSafeTimer)
    updateDownloaded = true

    sendUpdaterStatus('Update ready. Restarting Reelms...')
    sendUpdaterProgress(100)

    setTimeout(() => {
      autoUpdater.quitAndInstall(false, true)
    }, 1200)
  })

  autoUpdater.on('error', (err) => {
    clearTimeout(failSafeTimer)

    console.error('[updates] check failed', err)
    sendUpdaterStatus('Could not check updates. Starting Reelms...')

    setTimeout(continueToApp, 900)
  })

  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    clearTimeout(failSafeTimer)

    console.error('[updates] check failed', err)
    sendUpdaterStatus('Could not check updates. Starting Reelms...')

    setTimeout(continueToApp, 900)
  }
}

setupSingleInstanceLock()
setupProtocolHandler()
setupIpcHandlers()

app.whenReady().then(() => {
  if (app.isPackaged) {
    setupAutoUpdaterForMainWindow()
  }

  runUpdateGate()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    if (app.isPackaged) runUpdateGate()
    else createWindow()
  }
})