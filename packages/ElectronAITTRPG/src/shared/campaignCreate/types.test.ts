import { describe, expect, it } from 'vitest'
import {
  buildDefaultCampaignCreateDraft,
  deathModeOptions,
  isDeathMode,
  validateCampaignCreateDraft
} from './types.js'

describe('campaign create metadata', () => {
  it('exposes death mode choices for the create modal', () => {
    expect(deathModeOptions.map((option) => option.id)).toEqual([
      'legendary',
      'standard',
      'respawn'
    ])
  })

  it('defaults region and NPC counts within supported ranges', () => {
    const draft = buildDefaultCampaignCreateDraft()
    expect(draft.regionCount).toBe(2)
    expect(draft.npcsPerRegion).toBe(2)
    expect(draft.generativeTokensEnabled).toBe(true)
    expect(() => validateCampaignCreateDraft(draft)).toThrow(/premise/i)
  })

  it('validates premise, death mode, and generation counts', () => {
    expect(isDeathMode('legendary')).toBe(true)
    expect(isDeathMode('hardcore')).toBe(false)

    const valid = {
      ...buildDefaultCampaignCreateDraft(),
      premise: 'Lantern roads wake under starlight.'
    }
    expect(() => validateCampaignCreateDraft(valid)).not.toThrow()

    expect(() =>
      validateCampaignCreateDraft({ ...valid, regionCount: 6 })
    ).toThrow(/region count/i)
    expect(() =>
      validateCampaignCreateDraft({ ...valid, npcsPerRegion: 11 })
    ).toThrow(/npcs per region/i)
  })
})
