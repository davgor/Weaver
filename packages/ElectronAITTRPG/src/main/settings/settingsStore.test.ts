import { describe, expect, it } from 'vitest'
import {
  buildDefaultSettingsSnapshot,
  type SettingsSnapshot,
  type TextProviderId,
  type UpdateSettingsRequest
} from '../../shared/settings/types.js'
import { createSettingsStore } from './settingsStore.js'

describe('settingsStore partial updates', () => {
  it('applies partial updates without losing independent provider rails', async () => {
    const written: SettingsSnapshot[] = []
    const store = createSettingsStore({
      initialSnapshot: {
        ...buildDefaultSettingsSnapshot(),
        embeddings: {
          mode: 'lexical',
          supportedModes: ['lexical', 'local', 'openai', 'gemini'],
          mixedModeNote: 'contract'
        }
      },
      write: async (snapshot) => {
        written.push(snapshot)
      }
    })

    const update: UpdateSettingsRequest = {
      textProvider: 'claude',
      providerModels: {
        claude: { selectedModelId: 'claude-3-5-sonnet-latest', customModelId: 'claude-custom' }
      },
      imageProvider: 'local',
      embedderMode: 'gemini'
    }

    const snapshot = await store.update(update)

    expect(snapshot.text.provider).toBe('claude')
    expect(snapshot.text.models.claude.customModelId).toBe('claude-custom')
    expect(snapshot.image.provider).toBe('local')
    expect(snapshot.embeddings.mode).toBe('gemini')
    expect(written).toHaveLength(1)
  })
})

describe('settingsStore intro and embedder validation', () => {
  it('tracks intro dismissal separately from provider settings', async () => {
    const store = createSettingsStore()
    expect(store.isIntroDismissed()).toBe(false)
    await store.dismissIntro()
    expect(store.isIntroDismissed()).toBe(true)
  })

  it('rejects dead embedder modes that are not supported by the live description', async () => {
    const store = createSettingsStore({
      initialSnapshot: {
        ...buildDefaultSettingsSnapshot(),
        embeddings: {
          mode: 'lexical',
          supportedModes: ['lexical', 'openai'],
          mixedModeNote: 'contract'
        }
      }
    })

    await expect(store.update({ embedderMode: 'gemini' })).rejects.toThrow(
      'Unsupported embedder mode: gemini'
    )
  })
})

describe('settingsStore replacement and validation', () => {
  it('replaces snapshots and writes the exact replacement', async () => {
    const written: SettingsSnapshot[] = []
    const store = createSettingsStore({
      write: (snapshot) => {
        written.push(snapshot)
      }
    })
    const replacement = {
      ...buildDefaultSettingsSnapshot(new Date('2026-01-02T00:00:00.000Z')),
      image: { provider: 'local' as const, generativeTokensEnabled: false }
    }

    await expect(store.replace(replacement)).resolves.toBe(replacement)

    expect(store.get()).toBe(replacement)
    expect(written).toEqual([replacement])
  })

  it('rejects unsupported text providers and curated model ids', async () => {
    const store = createSettingsStore()
    const unsupportedProvider = 'ollama' as TextProviderId

    await expect(store.update({ textProvider: unsupportedProvider })).rejects.toThrow(
      'Unsupported text provider: ollama'
    )
    await expect(store.update({
      providerModels: {
        openai: { selectedModelId: 'gpt-5' }
      }
    })).rejects.toThrow('Unsupported openai model: gpt-5')
  })
})
