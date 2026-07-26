import { createTextCompletionClient, type LlmRuntime } from '@weaver/llm-engine'
import {
  type SettingsApi,
  type SettingsSnapshot
} from '../../shared/settings/types.js'
import { effectiveTextModelId } from '../../shared/settings/types.js'
import { createLocalProviderRuntime } from './localProviderRuntime.js'
import { snapshotToProviderSettings } from './providerSettings.js'
import type { LocalLlmCompletePort, TextCompletionClientFactory } from './settingsPorts.js'

type SettingsApplyResult = Awaited<ReturnType<SettingsApi['update']>>['apply']

export type SettingsRuntime = {
  applySettings: (snapshot: SettingsSnapshot) => Promise<SettingsApplyResult>
  getActiveTextClient: () => LlmRuntime | null
}

type SettingsRuntimeOptions = {
  createTextClient?: TextCompletionClientFactory
  localEngine?: LocalLlmCompletePort
}

export function createSettingsRuntime(options: SettingsRuntimeOptions = {}): SettingsRuntime {
  const state: { textClient: LlmRuntime | null } = { textClient: null }
  const createTextClient = options.createTextClient ?? createTextCompletionClient
  const localEngine = options.localEngine
  return {
    applySettings: (snapshot) => applySettings(snapshot, state, createTextClient, localEngine),
    getActiveTextClient: () => state.textClient
  }
}

async function applySettings(
  snapshot: SettingsSnapshot,
  state: { textClient: LlmRuntime | null },
  createTextClient: TextCompletionClientFactory,
  localEngine: LocalLlmCompletePort | undefined
): Promise<SettingsApplyResult> {
  const provider = snapshot.text.provider
  const model = effectiveTextModelId(snapshot)
  try {
    const nextClient = createTextClient(clientOptions(snapshot, localEngine))
    const previous = state.textClient
    state.textClient = nextClient
    await previous?.dispose()
    return { ok: true, provider, model, message: 'Settings applied.' }
  } catch (error) {
    return { ok: false, provider, model, message: errorMessage(error) }
  }
}

function clientOptions(
  snapshot: SettingsSnapshot,
  localEngine: LocalLlmCompletePort | undefined
): Parameters<TextCompletionClientFactory>[0] {
  const options: Parameters<TextCompletionClientFactory>[0] = {
    settings: snapshotToProviderSettings(snapshot)
  }
  if (snapshot.text.provider === 'local' && localEngine !== undefined) {
    return { ...options, localRuntime: createLocalProviderRuntime(localEngine) }
  }
  return options
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to apply settings.'
}
