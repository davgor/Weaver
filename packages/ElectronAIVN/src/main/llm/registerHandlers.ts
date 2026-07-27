import { BrowserWindow, ipcMain } from 'electron'
import type { LlmStatus } from '@weaver/llm-engine'
import type {
  BootProgressUpdate,
  FirstRunSnapshot,
  LocalBackendPreference
} from '../../shared/gameApi.js'
import {
  LLM_INSTALL_PROGRESS_CHANNEL,
  STARTUP_BOOT_PROGRESS_CHANNEL,
  type LocalModelInstallProgress
} from '../../shared/llmTypes.js'
import {
  readBackendPreference,
  readFirstRunDismissed,
  writeBackendPreference,
  writeFirstRunDismissed,
  type PrefsFs
} from './backendPreferenceStore.js'
import { canDismissFirstRun, evaluateFirstRunGate } from './firstRunGate.js'
import { getLocalModelStatus, installLocalModel } from './localModelInstall.js'
import type { LocalLlmEnginePort } from './llmPorts.js'
import { runStartupBoot } from './startupBoot.js'
import { warmLocalRuntime } from './warmRuntime.js'
import type { EngineHealthCheck } from './startupBoot.js'

export type LlmHandlerDeps = {
  getEngine: () => LocalLlmEnginePort
  setPreferredBackend: (backend: LocalBackendPreference) => Promise<void>
  prefsFs: PrefsFs
  prefsPath: string
  checkEngines: () => EngineHealthCheck
}

export function registerLlmHandlers(deps: LlmHandlerDeps): void {
  ipcMain.handle('llm:getStatus', () => getStatusSnapshot(deps))
  ipcMain.handle('llm:install', () => installWithProgress(deps))
  ipcMain.handle('llm:getBackend', () => readBackendPreference(deps.prefsFs, deps.prefsPath))
  ipcMain.handle('llm:setBackend', (_event, backend: LocalBackendPreference) =>
    setBackend(deps, backend)
  )
  ipcMain.handle('firstRun:get', () => getFirstRunSnapshot(deps))
  ipcMain.handle('firstRun:dismiss', () => dismissFirstRun(deps))
  ipcMain.handle('startup:getBoot', () => bootWithWarm(deps))
}

async function getStatusSnapshot(deps: LlmHandlerDeps): Promise<LlmStatus> {
  return getLocalModelStatus(deps.getEngine())
}

async function installWithProgress(deps: LlmHandlerDeps): Promise<LlmStatus> {
  return installLocalModel(deps.getEngine(), broadcastInstallProgress)
}

async function setBackend(
  deps: LlmHandlerDeps,
  backend: LocalBackendPreference
): Promise<LocalBackendPreference> {
  await writeBackendPreference(deps.prefsFs, deps.prefsPath, backend)
  await deps.setPreferredBackend(backend)
  return backend
}

async function getFirstRunSnapshot(deps: LlmHandlerDeps): Promise<FirstRunSnapshot> {
  const status = await getLocalModelStatus(deps.getEngine())
  const backend = await readBackendPreference(deps.prefsFs, deps.prefsPath)
  const dismissed = await readFirstRunDismissed(deps.prefsFs, deps.prefsPath)
  return evaluateFirstRunGate({
    localPhase: status.phase,
    backendChosen: backend !== null,
    dismissed
  })
}

async function dismissFirstRun(deps: LlmHandlerDeps): Promise<FirstRunSnapshot> {
  const current = await getFirstRunSnapshot(deps)
  if (!canDismissFirstRun(current.ready)) {
    throw new Error('First-run cannot be dismissed until the local model is ready.')
  }
  await writeFirstRunDismissed(deps.prefsFs, deps.prefsPath, true)
  return getFirstRunSnapshot(deps)
}

async function bootWithWarm(deps: LlmHandlerDeps) {
  return runStartupBoot(
    {
      checkEngines: deps.checkEngines,
      getLocalPhase: async () => (await getLocalModelStatus(deps.getEngine())).phase,
      warmRuntime: async () => warmLocalRuntime(deps.getEngine())
    },
    broadcastBootProgress
  )
}

function broadcastInstallProgress(progress: LocalModelInstallProgress): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(LLM_INSTALL_PROGRESS_CHANNEL, progress)
    }
  }
}

function broadcastBootProgress(update: BootProgressUpdate): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(STARTUP_BOOT_PROGRESS_CHANNEL, update)
    }
  }
}
