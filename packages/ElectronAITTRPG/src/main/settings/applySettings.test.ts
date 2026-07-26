import { describe, expect, it } from 'vitest'
import type { LlmBackend, ProviderId } from '@weaver/llm-engine'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { createSettingsRuntime } from './applySettings.js'
import type { TextCompletionClientFactory } from './settingsPorts.js'

describe('applySettings hot-swap', () => {
  it('hot-swaps the active text completion client whenever settings change', async () => {
    const providers: string[] = []
    let disposed = 0
    const createTextClient: TextCompletionClientFactory = (options) => {
      providers.push(options.settings?.provider ?? 'missing')
      return {
        completeText: async () => ({ text: 'ok', backend: backendFor(options.settings?.provider) }),
        dispose: async () => {
          disposed += 1
        }
      }
    }
    const runtime = createSettingsRuntime({ createTextClient })
    const first = buildDefaultSettingsSnapshot()
    const second = {
      ...first,
      text: { ...first.text, provider: 'openai' as const }
    }

    expect(await runtime.applySettings(first)).toMatchObject({ ok: true, provider: 'player2' })
    expect(await runtime.applySettings(second)).toMatchObject({ ok: true, provider: 'openai' })
    expect(runtime.getActiveTextClient()).not.toBeNull()
    expect(providers).toEqual(['player2', 'openai'])
    expect(disposed).toBe(1)
  })

  it('keeps the previous client when a provider cannot be resolved', async () => {
    const createTextClient: TextCompletionClientFactory = (options) => {
      if (options.settings?.provider === 'claude') {
        throw new Error('missing key')
      }
      return {
        completeText: async () => ({ text: 'ok', backend: backendFor(options.settings?.provider) }),
        dispose: async () => undefined
      }
    }
    const runtime = createSettingsRuntime({ createTextClient })
    const baseline = await runtime.applySettings(buildDefaultSettingsSnapshot())
    const failed = await runtime.applySettings({
      ...buildDefaultSettingsSnapshot(),
      text: { ...buildDefaultSettingsSnapshot().text, provider: 'claude' }
    })

    expect(baseline.ok).toBe(true)
    expect(failed).toMatchObject({ ok: false, provider: 'claude', message: 'missing key' })
    expect(runtime.getActiveTextClient()).not.toBeNull()
  })
})

describe('applySettings local provider', () => {
  it('injects a local runtime adapter when the local provider is selected', async () => {
    let sawLocalRuntime = false
    const createTextClient: TextCompletionClientFactory = (options) => {
      sawLocalRuntime = options.localRuntime !== undefined
      return {
        completeText: async () => ({ text: 'local ok', backend: 'cpu' }),
        dispose: async () => undefined
      }
    }
    const runtime = createSettingsRuntime({
      createTextClient,
      localEngine: {
        completeText: async () => ({ text: 'local ok', backend: 'cpu' })
      }
    })
    const snapshot = {
      ...buildDefaultSettingsSnapshot(),
      text: { ...buildDefaultSettingsSnapshot().text, provider: 'local' as const }
    }

    await expect(runtime.applySettings(snapshot)).resolves.toMatchObject({
      ok: true,
      provider: 'local'
    })
    expect(sawLocalRuntime).toBe(true)
  })
})

describe('applySettings error messages', () => {
  it('returns the generic apply error message for non-Error failures', async () => {
    const runtime = createSettingsRuntime({
      createTextClient: () => {
        const failure: unknown = { reason: 'boom' }
        throw failure
      }
    })

    const result = await runtime.applySettings(buildDefaultSettingsSnapshot())

    expect(result).toMatchObject({
      ok: false,
      provider: 'player2',
      message: 'Unable to apply settings.'
    })
    expect(runtime.getActiveTextClient()).toBeNull()
  })
})

function backendFor(provider: ProviderId | undefined): LlmBackend {
  if (provider === undefined || provider === 'local') {
    return 'cpu'
  }
  return provider
}
