import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { resolveBrowserWindowIconPath } from './appIcon.js'
import { buildStartupBoot } from './engineCatalog.js'
import { initAutoUpdate, registerAutoUpdateHandlers } from './autoUpdate.js'
import { registerCharacterSheetHandlers } from './characterSheet/registerHandlers.js'
import { setupGlobalErrorLogging } from './logger.js'
import { APP_DISPLAY_NAME } from '../shared/appBranding.js'

Menu.setApplicationMenu(null)
setupGlobalErrorLogging()

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    frame: false,
    title: APP_DISPLAY_NAME,
    icon: resolveBrowserWindowIconPath({
      isPackaged: app.isPackaged,
      appPath: app.getAppPath(),
      resourcesPath: process.resourcesPath
    }),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return mainWindow
}

function registerWindowControlHandlers(): void {
  ipcMain.on('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.on('window:maximize', (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return
    if (window.isMaximized()) {
      window.unmaximize()
      return
    }
    window.maximize()
  })

  ipcMain.on('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })
}

function registerGameHandlers(): void {
  ipcMain.handle('startup:getBoot', () => buildStartupBoot())
  ipcMain.handle('campaigns:list', () => [])
  ipcMain.handle('app:getVersion', () => app.getVersion())
  registerCharacterSheetHandlers()
}

app.whenReady().then(() => {
  registerWindowControlHandlers()
  registerGameHandlers()
  registerAutoUpdateHandlers()
  initAutoUpdate()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
