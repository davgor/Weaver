import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { combatEngine } from '@weaver/combat-engine'
import { actionEngine } from '@weaver/action-engine'
import { characterEngine } from '@weaver/character-engine'
import { worldEngine } from '@weaver/world-engine'
import { regionalEngine } from '@weaver/regional-engine'
import { civilizationEngine } from '@weaver/civilization-engine'
import { dungeonEngine } from '@weaver/dungeon-engine'
import { narrationEngine } from '@weaver/narration-engine'
import { itemEngine } from '@weaver/item-engine'
import { npcEngine } from '@weaver/npc-engine'
import { enemyEngine } from '@weaver/enemy-engine'
import { dmEngine } from '@weaver/dm-engine'
import { llmEngine } from '@weaver/llm-engine'
import { APP_DISPLAY_NAME } from '../shared/appBranding.js'
import { buildCatalog, dispatchEngineCall, type DispatchableEngine } from './engineDispatch.js'

// Add new engines here as they're scaffolded
// and to REQUIRED_ENGINE_IDS in ElectronAITTRPG/src/shared/engineHealth.ts.
const engines: readonly DispatchableEngine[] = [
  combatEngine,
  actionEngine,
  characterEngine,
  worldEngine,
  regionalEngine,
  civilizationEngine,
  dungeonEngine,
  narrationEngine,
  itemEngine,
  npcEngine,
  enemyEngine,
  dmEngine,
  llmEngine
]

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
  ipcMain.handle('engines:list', () => buildCatalog(engines))

  ipcMain.handle(
    'engines:call',
    async (_event, engineId: string, endpoint: string, payload?: unknown) =>
      dispatchEngineCall(engines, engineId, endpoint, payload)
  )

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
