import { beforeEach, describe, expect, it } from 'vitest'
import {
  appendSceneBlock,
  appendSocialLine,
  clearNarrationStore,
  projectScene,
  projectSocial
} from '../proseApi.js'
import {
  exportNarrationCampaignSlice,
  importNarrationCampaignSlice
} from '../index.js'
import {
  NARRATION_SLICE_VERSION,
  NarrationPortabilitySchemaError,
  exportCampaignSlice,
  importCampaignSlice,
  type NarrationCampaignSlice
} from './index.js'

const CAMPAIGN_ID = 'campaign-narration'

beforeEach(() => {
  clearNarrationStore()
})

describe('NarrationEngine campaign portability', () => {
  it('round-trips social lines and scene blocks while preserving projection ids', () => {
    const social = appendSocialLine({
      kind: 'npc',
      speakerId: 'npc-barkeep',
      text: 'The storm has teeth tonight.',
      at: 101
    })
    const scene = appendSceneBlock({ text: 'Rain lashes the slate roof.', at: 102 })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice).toEqual({
      sliceVersion: NARRATION_SLICE_VERSION,
      campaignId: CAMPAIGN_ID,
      socialLines: [social],
      sceneBlocks: [scene]
    })

    clearNarrationStore()
    importCampaignSlice(ctx, slice)

    expect(projectSocial()).toEqual([social])
    expect(projectScene()).toEqual([scene])
    expect(appendSocialLine({ kind: 'player', speakerId: 'pc-1', text: 'We go anyway.', at: 103 })).toEqual({
      id: 'social-3',
      kind: 'player',
      speakerId: 'pc-1',
      text: 'We go anyway.',
      at: 103
    })
  })

  it('exports package-level aliases for campaign portability', () => {
    appendSocialLine({
      kind: 'player',
      speakerId: 'pc-1',
      text: 'I ask about the ruins.',
      at: 201
    })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportNarrationCampaignSlice(ctx)
    clearNarrationStore()
    importNarrationCampaignSlice(ctx, slice)

    expect(projectSocial().map((line) => line.text)).toEqual(['I ask about the ruins.'])
  })
})

describe('NarrationEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, sliceVersion: 99 as typeof NARRATION_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NarrationPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/Unsupported narration slice version/)
  })

  it('rejects campaignId mismatches', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(NarrationPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })
})

function seedAndExport(): { ctx: { campaignId: string }; slice: NarrationCampaignSlice } {
  appendSceneBlock({ text: 'The room waits in silence.', at: 301 })
  const ctx = { campaignId: CAMPAIGN_ID }
  return { ctx, slice: exportCampaignSlice(ctx) }
}
