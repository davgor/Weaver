import { describe, expect, it } from 'vitest'
import { resolveProviderConfig, type ProviderId } from './providerConfig.js'

describe('resolveProviderConfig provider ids and precedence', () => {
  it('publishes the supported provider id union', () => {
    const providers: ProviderId[] = ['claude', 'openai', 'gemini', 'grok', 'player2', 'local']
    expect(providers).toEqual(['claude', 'openai', 'gemini', 'grok', 'player2', 'local'])
  })

  it('uses settings before environment variables', () => {
    const config = resolveProviderConfig(
      {
        provider: 'openai',
        openai: {
          apiKey: 'settings-openai-key',
          model: 'settings-openai-model'
        }
      },
      {
        AGENT_PROVIDER: 'claude',
        OPENAI_API_KEY: 'env-openai-key',
        OPENAI_MODEL: 'env-openai-model'
      }
    )

    expect(config).toEqual({
      provider: 'openai',
      apiKey: 'settings-openai-key',
      model: 'settings-openai-model',
      baseUrl: 'https://api.openai.com/v1'
    })
  })
})

describe('resolveProviderConfig defaults and validation', () => {
  it('falls back to provider-specific environment variables', () => {
    const config = resolveProviderConfig(undefined, {
      AGENT_PROVIDER: 'grok',
      XAI_API_KEY: 'xai-env-key',
      GROK_MODEL: 'grok-env-model'
    })

    expect(config).toEqual({
      provider: 'grok',
      apiKey: 'xai-env-key',
      model: 'grok-env-model',
      baseUrl: 'https://api.x.ai/v1'
    })
  })

  it('defaults to local when no provider is configured', () => {
    expect(resolveProviderConfig(undefined, {})).toEqual({ provider: 'local' })
  })

  it('defaults Player2 to localhost without requiring an API key', () => {
    expect(resolveProviderConfig({ provider: 'player2' }, {})).toEqual({
      provider: 'player2',
      model: 'player2',
      baseUrl: 'http://127.0.0.1:4315'
    })
  })

  it('rejects cloud providers without an API key', () => {
    expect(() => resolveProviderConfig({ provider: 'claude' }, {})).toThrow(/CLAUDE_API_KEY/i)
  })
})
