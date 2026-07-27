import { BrowserWindow, ipcMain } from 'electron'
import { createTextCompletionClient, llmEngine } from '@weaver/llm-engine'
import { narrationEngine } from '@weaver/narration-engine'
import type { LocalModelInstallProgress } from '../../shared/settings/localModelTypes.js'
import { LOCAL_MODEL_INSTALL_EVENT_CHANNEL } from '../../shared/settings/localModelTypes.js'
import type { SettingsIntroSnapshot } from '../../shared/settings/settingsIntroTypes.js'
import type {
  SettingsApi,
  SettingsSnapshot,
  UpdateSettingsRequest
} from '../../shared/settings/types.js'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { createSettingsRuntime, type SettingsRuntime } from './applySettings.js'
import {
  checkSettingsConnection,
  type ConnectionCheckPorts
} from './checkConnection.js'
import { getLocalModelStatus, installLocalModel } from './localModelInstall.js'
import { refreshSupportedEmbedderModes } from './ragSettings.js'
import { canDismissSettingsIntro, evaluateSettingsIntro } from './settingsIntro.js'
import { createSettingsStore, type SettingsStore } from './settingsStore.js'
import type { LocalLlmInstallPort, RagDescriptionPort } from './settingsPorts.js'

type CheckConnectionRequest = Parameters<SettingsApi['checkConnection']>[0]
type SettingsUpdateResponse = Awaited<ReturnType<SettingsApi['update']>>

export type SettingsHandlerDeps = {
  store: SettingsStore
  runtime: SettingsRuntime
  narration: RagDescriptionPort
  connection: ConnectionCheckPorts
  llmEngine: LocalLlmInstallPort
}

function createLiveSettingsHandlerDeps(): SettingsHandlerDeps {
  return {
    store: createSettingsStore({ initialSnapshot: buildDefaultSettingsSnapshot() }),
    runtime: createSettingsRuntime({
      createTextClient: createTextCompletionClient,
      localEngine: llmEngine
    }),
    narration: narrationEngine,
    connection: {
      createTextClient: createTextCompletionClient,
      llmEngine
    },
    llmEngine
  }
}

export function registerSettingsHandlers(
  deps: SettingsHandlerDeps = createLiveSettingsHandlerDeps()
): void {
  ipcMain.handle('settings:get', () => getSettingsSnapshot(deps))
  ipcMain.handle('settings:update', (_event, request: UpdateSettingsRequest) =>
    updateSettingsSnapshot(deps, request)
  )
  ipcMain.handle('settings:checkConnection', (_event, request?: CheckConnectionRequest) =>
    checkSettingsConnection(deps.connection, deps.store.get(), request)
  )
  ipcMain.handle('settings:getLocalModelStatus', () => getLocalModelStatus(deps.llmEngine))
  ipcMain.handle('settings:installLocalModel', () => installLocalModelWithProgress(deps))
  ipcMain.handle('settingsIntro:get', () => getSettingsIntroSnapshot(deps))
  ipcMain.handle('settingsIntro:dismiss', () => dismissSettingsIntro(deps))
}

async function getSettingsSnapshot(deps: SettingsHandlerDeps): Promise<SettingsSnapshot> {
  return await refreshAndStore(deps)
}

async function updateSettingsSnapshot(
  deps: SettingsHandlerDeps,
  request: UpdateSettingsRequest
): Promise<SettingsUpdateResponse> {
  await refreshAndStore(deps)
  const snapshot = await deps.store.update(request)
  const apply = await deps.runtime.applySettings(snapshot)
  return { snapshot, apply }
}

async function refreshAndStore(deps: SettingsHandlerDeps): Promise<SettingsSnapshot> {
  const refreshed = await refreshSupportedEmbedderModes(deps.store.get(), deps.narration)
  return await deps.store.replace(refreshed)
}

async function installLocalModelWithProgress(deps: SettingsHandlerDeps) {
  const status = await installLocalModel(deps.llmEngine, broadcastInstallProgress)
  await deps.runtime.applySettings(deps.store.get())
  return status
}

function broadcastInstallProgress(progress: LocalModelInstallProgress): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(LOCAL_MODEL_INSTALL_EVENT_CHANNEL, progress)
    }
  }
}

async function getSettingsIntroSnapshot(deps: SettingsHandlerDeps): Promise<SettingsIntroSnapshot> {
  const status = await getLocalModelStatus(deps.llmEngine)
  return evaluateSettingsIntro({
    dismissed: deps.store.isIntroDismissed(),
    snapshot: deps.store.get(),
    localPhase: status?.phase ?? null
  })
}

async function dismissSettingsIntro(deps: SettingsHandlerDeps): Promise<SettingsIntroSnapshot> {
  const current = await getSettingsIntroSnapshot(deps)
  if (!canDismissSettingsIntro(current.ready)) {
    throw new Error('Settings intro cannot be dismissed until setup is ready.')
  }
  await deps.store.dismissIntro()
  return getSettingsIntroSnapshot(deps)
}
