import { describe, expect, it } from 'vitest'
import {
  buildDefaultSettingsSnapshot,
  curatedModelIds,
  embedderModeOptions,
  effectiveTextModelId,
  imageProviderOptions,
  supportedEmbedderModesFromDescription,
  textProviderOptions
} from './types.js'

describe('settings metadata', () => {
  it('exposes curated text, image, and embedding choices for the settings UI', () => {
    expect(textProviderOptions.map((option) => option.id)).toEqual([
      'claude',
      'openai',
      'gemini',
      'grok',
      'player2'
    ])
    expect(curatedModelIds('claude')).toContain('claude-3-5-sonnet-latest')
    expect(curatedModelIds('openai')).toContain('gpt-4o-mini')
    expect(curatedModelIds('gemini')).toContain('gemini-1.5-flash')
    expect(curatedModelIds('grok')).toContain('grok-3-latest')
    expect(curatedModelIds('player2')).toEqual(['player2'])
    expect(imageProviderOptions.map((option) => option.id)).toEqual(['cloud', 'player2', 'local'])
    expect(embedderModeOptions.map((option) => option.id)).toEqual([
      'lexical',
      'local',
      'openai',
      'gemini'
    ])
  })

  it('prefers custom provider model ids only when the player supplies one', () => {
    const snapshot = buildDefaultSettingsSnapshot()
    expect(effectiveTextModelId(snapshot, 'openai')).toBe('gpt-4o-mini')

    const custom = {
      ...snapshot,
      text: {
        ...snapshot.text,
        models: {
          ...snapshot.text.models,
          openai: { selectedModelId: 'gpt-4o-mini', customModelId: ' custom-openai ' }
        }
      }
    }
    expect(effectiveTextModelId(custom, 'openai')).toBe('custom-openai')
  })

  it('derives live embedder options from NarrationEngine describeRagRetrieval output', () => {
    expect(
      supportedEmbedderModesFromDescription({
        embedderModes: ['lexical', 'openai', 'not-real']
      })
    ).toEqual(['lexical', 'openai'])
    expect(supportedEmbedderModesFromDescription({ embedderModes: [] })).toEqual(['lexical'])
  })
})
