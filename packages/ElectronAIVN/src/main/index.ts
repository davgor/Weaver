import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import { join } from 'node:path'
import type { LocalBackendPreference } from '../shared/gameApi.js'
import { APP_DISPLAY_NAME } from '../shared/appBranding.js'
import { resolveBrowserWindowIconPath } from './appIcon.js'
import { checkCatalogHealth } from './engineCatalog.js'
import { createPreferredLlmEngine, defaultAivnLlmDataDir } from './llm/createPreferredEngine.js'
import { createNodePrefsFs } from './llm/nodePrefsFs.js'
import { readBackendPreference } from './llm/backendPreferenceStore.js'
import { registerLlmHandlers } from './llm/registerHandlers.js'
import type { LocalLlmEnginePort } from './llm/llmPorts.js'

Menu.setApplicationMenu(null)

type EngineHolder = { current: LocalLlmEnginePort }

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

async function wireLlmAndStartup(): Promise<void> {
  const prefsFs = createNodePrefsFs()
  const prefsPath = join(app.getPath('userData'), 'aivn-llm-prefs.json')
  const dataDir = defaultAivnLlmDataDir(app.getPath('userData'))
  const preferred = await readBackendPreference(prefsFs, prefsPath)
  const holder: EngineHolder = {
    current: createPreferredLlmEngine({ dataDir, preferredBackend: preferred })
  }

  registerLlmHandlers({
    getEngine: () => holder.current,
    setPreferredBackend: async (backend: LocalBackendPreference) => {
      holder.current = createPreferredLlmEngine({ dataDir, preferredBackend: backend })
    },
    prefsFs,
    prefsPath,
    checkEngines: checkCatalogHealth
  })
}

function registerAppHandlers(): void {
  ipcMain.handle('app:getVersion', () => app.getVersion())
}

app.whenReady().then(async () => {
  registerWindowControlHandlers()
  registerAppHandlers()
  await wireLlmAndStartup()
  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
