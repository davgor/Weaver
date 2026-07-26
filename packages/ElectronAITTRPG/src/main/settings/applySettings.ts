import { createTextCompletionClient, type LlmRuntime } from '@weaver/llm-engine'
import {
  type SettingsApi,
  type SettingsSnapshot
} from '../../shared/settings/types.js'
import { effectiveTextModelId } from '../../shared/settings/types.js'
import { snapshotToProviderSettings } from './providerSettings.js'
import type { TextCompletionClientFactory } from './settingsPorts.js'

type SettingsApplyResult = Awaited<ReturnType<SettingsApi['update']>>['apply']

export type SettingsRuntime = {
  applySettings: (snapshot: SettingsSnapshot) => Promise<SettingsApplyResult>
  getActiveTextClient: () => LlmRuntime | null
}

type SettingsRuntimeOptions = {
  createTextClient?: TextCompletionClientFactory
}

export function createSettingsRuntime(options: SettingsRuntimeOptions = {}): SettingsRuntime {
  const state: { textClient: LlmRuntime | null } = { textClient: null }
  const createTextClient = options.createTextClient ?? createTextCompletionClient
  return {
    applySettings: (snapshot) => applySettings(snapshot, state, createTextClient),
    getActiveTextClient: () => state.textClient
  }
}

async function applySettings(
  snapshot: SettingsSnapshot,
  state: { textClient: LlmRuntime | null },
  createTextClient: TextCompletionClientFactory
): Promise<SettingsApplyResult> {
  const provider = snapshot.text.provider
  const model = effectiveTextModelId(snapshot)
  try {
    const nextClient = createTextClient({ settings: snapshotToProviderSettings(snapshot) })
    const previous = state.textClient
    state.textClient = nextClient
    await previous?.dispose()
    return { ok: true, provider, model, message: 'Settings applied.' }
  } catch (error) {
    return { ok: false, provider, model, message: errorMessage(error) }
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to apply settings.'
}
