import { describe, expect, it } from 'vitest'
import {
  buildDefaultCampaignCreateDraft,
  deathModeOptions
} from '../../../shared/campaignCreate/types'
import { defaultCampaignStartDraft, isDeathModeChoice } from './CampaignStartModal'

describe('campaign start modal helpers', () => {
  it('exposes default draft values and death mode choices for the form', () => {
    const draft = defaultCampaignStartDraft()
    expect(draft).toEqual(buildDefaultCampaignCreateDraft())
    expect(deathModeOptions.map((option) => option.id)).toEqual([
      'legendary',
      'standard',
      'respawn'
    ])
    expect(isDeathModeChoice('legendary')).toBe(true)
    expect(isDeathModeChoice('hardcore')).toBe(false)
  })
})
