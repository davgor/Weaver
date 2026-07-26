import { ipcMain } from 'electron'
import { createTextCompletionClient, llmEngine } from '@weaver/llm-engine'
import { narrationEngine } from '@weaver/narration-engine'
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
import { refreshSupportedEmbedderModes } from './ragSettings.js'
import { createSettingsStore, type SettingsStore } from './settingsStore.js'
import type { RagDescriptionPort } from './settingsPorts.js'

type CheckConnectionRequest = Parameters<SettingsApi['checkConnection']>[0]
type SettingsUpdateResponse = Awaited<ReturnType<SettingsApi['update']>>

type SettingsHandlerDeps = {
  store: SettingsStore
  runtime: SettingsRuntime
  narration: RagDescriptionPort
  connection: ConnectionCheckPorts
}

function createLiveSettingsHandlerDeps(): SettingsHandlerDeps {
  return {
    store: createSettingsStore({ initialSnapshot: buildDefaultSettingsSnapshot() }),
    runtime: createSettingsRuntime({ createTextClient: createTextCompletionClient }),
    narration: narrationEngine,
    connection: {
      createTextClient: createTextCompletionClient,
      llmEngine
    }
  }
}

export function registerSettingsHandlers(deps: SettingsHandlerDeps = createLiveSettingsHandlerDeps()): void {
  ipcMain.handle('settings:get', () => getSettingsSnapshot(deps))
  ipcMain.handle('settings:update', (_event, request: UpdateSettingsRequest) =>
    updateSettingsSnapshot(deps, request)
  )
  ipcMain.handle('settings:checkConnection', (_event, request?: CheckConnectionRequest) =>
    checkSettingsConnection(deps.connection, deps.store.get(), request)
  )
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
