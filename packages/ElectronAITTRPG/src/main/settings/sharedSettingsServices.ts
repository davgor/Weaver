import { createTextCompletionClient, llmEngine } from '@weaver/llm-engine'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { createSettingsRuntime, type SettingsRuntime } from './applySettings.js'
import { createSettingsStore, type SettingsStore } from './settingsStore.js'
import { createSettingsBackedTextCompleter } from './settingsTextCompleter.js'
import type { TextCompleter } from '@weaver/narration-engine'

export type SharedSettingsServices = {
  store: SettingsStore
  runtime: SettingsRuntime
  textCompleter: TextCompleter
}

export function createSharedSettingsServices(
  overrides: Partial<{
    store: SettingsStore
    runtime: SettingsRuntime
    createFallbackClient: () => ReturnType<typeof createTextCompletionClient>
  }> = {}
): SharedSettingsServices {
  const store =
    overrides.store ?? createSettingsStore({ initialSnapshot: buildDefaultSettingsSnapshot() })
  const runtime =
    overrides.runtime ??
    createSettingsRuntime({
      createTextClient: createTextCompletionClient,
      localEngine: llmEngine
    })
  const textCompleter = createSettingsBackedTextCompleter({
    getActiveTextClient: () => runtime.getActiveTextClient(),
    createFallbackClient: overrides.createFallbackClient ?? (() => createTextCompletionClient())
  })
  return { store, runtime, textCompleter }
}
