import { describe, expect, it } from 'vitest'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { refreshSupportedEmbedderModes } from './ragSettings.js'
import type { RagDescriptionPort } from './settingsPorts.js'

describe('refreshSupportedEmbedderModes', () => {
  it('keeps the selected mode when NarrationEngine still supports it', async () => {
    const snapshot = {
      ...buildDefaultSettingsSnapshot(),
      embeddings: {
        mode: 'openai' as const,
        supportedModes: ['lexical' as const],
        mixedModeNote: 'old note'
      }
    }

    const refreshed = await refreshSupportedEmbedderModes(snapshot, ragPort({
      embedderModes: ['local', 'openai', 'gemini'],
      mixedModeNote: 'new note'
    }))

    expect(refreshed.embeddings).toEqual({
      mode: 'openai',
      supportedModes: ['local', 'openai', 'gemini'],
      mixedModeNote: 'new note'
    })
  })

  it('falls back to the first supported mode when the selected mode disappears', async () => {
    const snapshot = {
      ...buildDefaultSettingsSnapshot(),
      embeddings: {
        mode: 'gemini' as const,
        supportedModes: ['gemini' as const],
        mixedModeNote: 'preserved note'
      }
    }

    const refreshed = await refreshSupportedEmbedderModes(snapshot, ragPort({
      embedderModes: ['openai', 'lexical'],
      mixedModeNote: 12
    }))

    expect(refreshed.embeddings).toEqual({
      mode: 'lexical',
      supportedModes: ['lexical', 'openai'],
      mixedModeNote: 'preserved note'
    })
  })
})

describe('refreshSupportedEmbedderModes fallbacks', () => {
  it('uses lexical mode when the RAG description is not a usable object', async () => {
    const snapshot = {
      ...buildDefaultSettingsSnapshot(),
      embeddings: {
        mode: 'local' as const,
        supportedModes: ['local' as const],
        mixedModeNote: 'fallback note'
      }
    }

    const refreshed = await refreshSupportedEmbedderModes(snapshot, ragPort(['local']))

    expect(refreshed.embeddings).toEqual({
      mode: 'lexical',
      supportedModes: ['lexical'],
      mixedModeNote: 'fallback note'
    })
  })
})

function ragPort(description: unknown): RagDescriptionPort {
  return {
    call: async (endpoint) => {
      expect(endpoint).toBe('describeRagRetrieval')
      return description
    }
  }
}
