import { afterEach, describe, expect, it } from 'vitest'
import {
  clearAutosaveStore,
  clearCharacterStatsStore,
  clearDeathModeStores,
  clearProgressionStore,
  getCharacterLifeStatus,
  getCharacterStats,
  getLatestAutosaveSnapshot,
  recordAutosaveSnapshot,
  resolveCharacterDeath,
  restoreCharacterStats,
  setCampaignDeathMode,
  setCharacterProgression,
  type CharacterStats
} from '@weaver/character-engine'

const CAMPAIGN_ID = 'electron-death-contract'
const CHARACTER_ID = 'pc-death-contract'

afterEach(() => {
  clearAutosaveStore()
  clearCharacterStatsStore()
  clearDeathModeStores()
  clearProgressionStore()
})

describe('CharacterEngine death mode contract: Legendary', () => {
  it('persists campaign death mode and resolves Legendary deaths with life status', async () => {
    expect(setCampaignDeathMode(CAMPAIGN_ID, 'legendary')).toBe('legendary')

    const result = await resolveCharacterDeath({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID,
      cause: 'A basilisk gaze',
      obituaryDraft: 'The road remembers the last lantern.'
    })

    expect(result).toMatchObject({
      mode: 'legendary',
      status: 'dead',
      cause: 'A basilisk gaze',
      obituary: 'The road remembers the last lantern.'
    })
    expect(getCharacterLifeStatus(CHARACTER_ID)).toMatchObject({
      status: 'dead',
      cause: 'A basilisk gaze'
    })
  })
})

describe('CharacterEngine death mode contract: Standard', () => {
  it('records autosave snapshots and lets Standard death restore the latest snapshot', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'standard')
    const snapshot = {
      stats: stats({ currentHp: 8 }),
      progression: setCharacterProgression(CHARACTER_ID, 2, 25),
      recordedAt: '2026-07-26T15:30:00.000Z'
    }

    recordAutosaveSnapshot(CHARACTER_ID, snapshot)
    restoreCharacterStats(stats({ currentHp: 0 }))

    const result = await resolveCharacterDeath({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID,
      cause: 'Death saving throws failed'
    })

    expect(getLatestAutosaveSnapshot(CHARACTER_ID)).toEqual(snapshot)
    expect(result).toEqual({ mode: 'standard', status: 'alive', restoredFromAutosave: true })
    expect(getCharacterStats(CHARACTER_ID)?.currentHp).toBe(8)
    expect(getCharacterLifeStatus(CHARACTER_ID)).toEqual({ status: 'alive' })
  })
})

describe('CharacterEngine death mode contract: Respawn', () => {
  it('resolves Respawn mode with relocation and cost details', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'respawn')

    const result = await resolveCharacterDeath({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID,
      cause: 'A failed last stand',
      respawnConfig: {
        relocateTo: 'The Lantern Shrine',
        cost: 5,
        maxRespawns: 3,
        currentGold: 15
      }
    })

    expect(result).toMatchObject({
      mode: 'respawn',
      status: 'alive',
      respawn: {
        relocatedTo: 'The Lantern Shrine',
        costPaid: 5,
        respawnsRemaining: 2,
        goldRemaining: 10
      }
    })
  })
})

function stats(overrides: { currentHp: number }): CharacterStats {
  return {
    characterId: CHARACTER_ID,
    maxHp: 10,
    currentHp: overrides.currentHp,
    conditions: overrides.currentHp === 0 ? ['Unconscious'] : [],
    dying:
      overrides.currentHp === 0
        ? { successes: 0, failures: 3, stable: false }
        : null
  }
}
