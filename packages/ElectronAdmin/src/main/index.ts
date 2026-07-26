import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { APP_DISPLAY_NAME } from '../shared/appBranding.js'
import { buildCatalog, dispatchEngineCall } from './engineDispatch.js'
import { adminEngines } from './engines.js'

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    title: APP_DISPLAY_NAME,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void win.loadURL(process.env.ELECTRON_RENDERER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ipcMain.handle('engines:list', () => buildCatalog(adminEngines))

  ipcMain.handle(
    'engines:call',
    async (_event, engineId: string, endpoint: string, payload?: unknown) =>
      dispatchEngineCall(adminEngines, engineId, endpoint, payload)
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
