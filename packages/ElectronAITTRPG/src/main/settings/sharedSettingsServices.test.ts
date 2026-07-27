import { describe, expect, it, vi } from 'vitest'
import type { LlmRuntime } from '@weaver/llm-engine'
import { createSettingsRuntime } from './applySettings.js'
import { createSharedSettingsServices } from './sharedSettingsServices.js'
import { createSettingsStore } from './settingsStore.js'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'

describe('createSharedSettingsServices', () => {
  it('exposes one runtime whose active client backs the text completer', async () => {
    const createTextClient = vi.fn((): LlmRuntime => ({
      completeText: async () => ({ text: 'from-settings', backend: 'openai' }),
      dispose: async () => undefined
    }))
    const runtime = createSettingsRuntime({ createTextClient })
    const store = createSettingsStore({ initialSnapshot: buildDefaultSettingsSnapshot() })
    const services = createSharedSettingsServices({
      store,
      runtime,
      createFallbackClient: () => {
        throw new Error('fallback unused after apply')
      }
    })

    await services.runtime.applySettings(store.get())
    await expect(services.textCompleter.completeText({ prompt: 'p' })).resolves.toEqual({
      text: 'from-settings',
      backend: 'openai'
    })
    expect(services.runtime).toBe(runtime)
    expect(services.store).toBe(store)
  })
})
