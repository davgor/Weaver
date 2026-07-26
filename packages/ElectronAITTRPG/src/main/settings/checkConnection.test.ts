import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL, type LlmStatus } from '@weaver/llm-engine'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { checkSettingsConnection } from './checkConnection.js'
import type { LocalLlmStatusPort, TextCompletionClientFactory } from './settingsPorts.js'

describe('checkSettingsConnection cloud providers', () => {
  it('confirms a configured cloud provider with a short text completion', async () => {
    const createTextClient: TextCompletionClientFactory = () => ({
      completeText: async (request) => ({
        text: `checked ${request.prompt}`,
        backend: 'openai'
      }),
      dispose: async () => undefined
    })
    const snapshot = {
      ...buildDefaultSettingsSnapshot(),
      text: {
        ...buildDefaultSettingsSnapshot().text,
        provider: 'openai' as const,
        credentials: {
          ...buildDefaultSettingsSnapshot().text.credentials,
          openai: { apiKey: 'test-key', baseUrl: '' }
        }
      }
    }

    const result = await checkSettingsConnection({ createTextClient }, snapshot)

    expect(result).toMatchObject({ ok: true, provider: 'openai', backend: 'openai' })
  })
})

describe('checkSettingsConnection cloud provider failures', () => {
  it('reports provider errors without throwing through IPC', async () => {
    const result = await checkSettingsConnection(
      {
        createTextClient: () => {
          throw new Error('missing key')
        }
      },
      { ...buildDefaultSettingsSnapshot(), text: { ...buildDefaultSettingsSnapshot().text, provider: 'claude' } }
    )

    expect(result).toEqual({
      ok: false,
      provider: 'claude',
      message: 'missing key'
    })
  })

  it('reports completion failures with a generic message for non-Error rejections', async () => {
    const result = await checkSettingsConnection(
      {
        createTextClient: () => ({
          completeText: async () => Promise.reject({ reason: 'offline' }),
          dispose: async () => undefined
        })
      },
      { ...buildDefaultSettingsSnapshot(), text: { ...buildDefaultSettingsSnapshot().text, provider: 'grok' } }
    )

    expect(result).toEqual({
      ok: false,
      provider: 'grok',
      message: 'Connection check failed.'
    })
  })
})

describe('checkSettingsConnection local provider', () => {
  it('returns local status when the local runtime API is available', async () => {
    const result = await checkSettingsConnection(
      { llmEngine: localLlm('installing', 'vulkan') },
      buildDefaultSettingsSnapshot(),
      { providerOverride: 'local' }
    )

    expect(result).toEqual({
      ok: false,
      provider: 'local',
      backend: 'vulkan',
      statusPhase: 'installing',
      message: 'Local LLM is installing.'
    })
  })
})

describe('checkSettingsConnection local provider failures', () => {
  it('confirms local readiness and reports missing local status APIs', async () => {
    await expect(checkSettingsConnection(
      { llmEngine: localLlm('ready', 'cpu') },
      buildDefaultSettingsSnapshot(),
      { providerOverride: 'local' }
    )).resolves.toMatchObject({
      ok: true,
      provider: 'local',
      backend: 'cpu',
      message: 'Local LLM is ready.'
    })

    await expect(checkSettingsConnection(
      {},
      buildDefaultSettingsSnapshot(),
      { providerOverride: 'local' }
    )).resolves.toEqual({
      ok: false,
      provider: 'local',
      message: 'Local LLM status API is unavailable.'
    })
  })

  it('reports local health failures without throwing through IPC', async () => {
    const result = await checkSettingsConnection(
      {
        llmEngine: {
          ...localLlm('ready', 'cpu'),
          health: () => {
            throw new Error('runtime missing')
          }
        }
      },
      buildDefaultSettingsSnapshot(),
      { providerOverride: 'local' }
    )

    expect(result).toEqual({
      ok: false,
      provider: 'local',
      message: 'runtime missing'
    })
  })
})

function localLlm(phase: LlmStatus['phase'], backend: 'vulkan' | 'cpu'): LocalLlmStatusPort {
  const status = statusFor(phase, backend)
  return {
    health: () => ({ ok: true, package: '@weaver/llm-engine', version: '0.1.0' }),
    getStatus: async () => status,
    resolveBackend: async () => backend,
    install: async () => status
  }
}

function statusFor(phase: LlmStatus['phase'], backend: 'vulkan' | 'cpu'): LlmStatus {
  return {
    phase,
    backend,
    model: DEFAULT_MODEL,
    modelPath: null,
    error: null,
    bytesDownloaded: 0,
    bytesTotal: null
  }
}
