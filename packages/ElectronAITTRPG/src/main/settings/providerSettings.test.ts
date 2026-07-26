import { describe, expect, it } from 'vitest'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { snapshotToProviderSettings } from './providerSettings.js'

describe('snapshotToProviderSettings', () => {
  it('omits blank credential fields after trimming whitespace', () => {
    const defaults = buildDefaultSettingsSnapshot()
    const settings = snapshotToProviderSettings({
      ...defaults,
      text: {
        ...defaults.text,
        provider: 'openai',
        credentials: {
          ...defaults.text.credentials,
          openai: { apiKey: '   ', baseUrl: '\n\t' }
        }
      }
    })

    expect(settings).toEqual({
      provider: 'openai',
      openai: { model: 'gpt-4o-mini' }
    })
  })

  it('uses custom model ids and non-empty credentials for the active provider', () => {
    const defaults = buildDefaultSettingsSnapshot()
    const settings = snapshotToProviderSettings({
      ...defaults,
      text: {
        ...defaults.text,
        provider: 'grok',
        models: {
          ...defaults.text.models,
          grok: { selectedModelId: 'grok-3-latest', customModelId: 'grok-custom' }
        },
        credentials: {
          ...defaults.text.credentials,
          grok: { apiKey: '  grok-key ', baseUrl: ' https://grok.test/v1 ' }
        }
      }
    })

    expect(settings).toEqual({
      provider: 'grok',
      grok: {
        model: 'grok-custom',
        apiKey: 'grok-key',
        baseUrl: 'https://grok.test/v1'
      }
    })
  })
})
