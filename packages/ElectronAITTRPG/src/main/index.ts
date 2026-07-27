import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import { resolveBrowserWindowIconPath } from './appIcon.js'
import { buildStartupBoot } from './engineCatalog.js'
import { initAutoUpdate, registerAutoUpdateHandlers } from './autoUpdate.js'
import { registerCharacterSheetHandlers } from './characterSheet/registerHandlers.js'
import { registerNpcDossierHandlers } from './npcDossier/registerHandlers.js'
import { registerSettingsHandlers } from './settings/registerHandlers.js'
import { registerCampaignCreateHandlers } from './campaignCreate/registerHandlers.js'
import { registerCampaignsHandlers } from './campaigns/registerHandlers.js'
import { registerCampaignHubHandlers } from './campaignHub/registerHandlers.js'
import { registerOnboardingHandlers } from './onboarding/registerHandlers.js'
import { registerPlayHandlers } from './play/registerHandlers.js'
import { createGameServices, resolveCampaignsRoot } from './gameServices.js'
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
  const services = createGameServices(resolveCampaignsRoot(app.getPath('userData')))
  ipcMain.handle('startup:getBoot', () => buildStartupBoot())
  ipcMain.handle('app:getVersion', () => app.getVersion())
  registerCampaignsHandlers({ service: services.campaigns })
  registerCharacterSheetHandlers()
  registerNpcDossierHandlers()
  registerSettingsHandlers(services.settingsHandlers)
  registerCampaignCreateHandlers({ service: services.campaignCreate })
  registerOnboardingHandlers({ service: services.onboarding })
  registerCampaignHubHandlers({ service: services.campaignHub })
  registerPlayHandlers(services.play)
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
