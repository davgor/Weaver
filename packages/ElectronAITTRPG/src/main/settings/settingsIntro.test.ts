import { describe, expect, it } from 'vitest'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { canDismissSettingsIntro, evaluateSettingsIntro } from './settingsIntro.js'

describe('evaluateSettingsIntro', () => {
  it('reports not needed after the player dismisses the intro', () => {
    const snapshot = evaluateSettingsIntro({
      dismissed: true,
      snapshot: buildDefaultSettingsSnapshot(),
      localPhase: 'not_installed'
    })

    expect(snapshot).toEqual({
      needed: false,
      dismissed: true,
      ready: true,
      reason: null
    })
  })

  it('needs setup until a cloud provider has credentials or the local model is ready', () => {
    const baseline = buildDefaultSettingsSnapshot()

    expect(
      evaluateSettingsIntro({
        dismissed: false,
        snapshot: baseline,
        localPhase: 'not_installed'
      })
    ).toMatchObject({
      needed: true,
      ready: false,
      reason: 'Configure a cloud provider API key or install the local Qwen model.'
    })

    expect(
      evaluateSettingsIntro({
        dismissed: false,
        snapshot: withOpenAiKey(baseline),
        localPhase: 'not_installed'
      })
    ).toMatchObject({ needed: false, ready: true })

    expect(
      evaluateSettingsIntro({
        dismissed: false,
        snapshot: baseline,
        localPhase: 'ready'
      })
    ).toMatchObject({ needed: false, ready: true })
  })
})

describe('canDismissSettingsIntro', () => {
  it('only allows dismissal once setup is ready', () => {
    expect(canDismissSettingsIntro(false)).toBe(false)
    expect(canDismissSettingsIntro(true)).toBe(true)
  })
})

function withOpenAiKey(snapshot: ReturnType<typeof buildDefaultSettingsSnapshot>) {
  return {
    ...snapshot,
    text: {
      ...snapshot.text,
      provider: 'openai' as const,
      credentials: {
        ...snapshot.text.credentials,
        openai: { apiKey: 'test-key', baseUrl: '' }
      }
    }
  }
}
