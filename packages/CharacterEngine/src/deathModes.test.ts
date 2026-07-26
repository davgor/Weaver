import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyHitPointDamage,
  clearCharacterStatsStore,
  getCharacterStats,
  persistCharacterMaxHp,
  resolveCharacterDyingSave
} from './hp.js'
import { clearAutosaveStore, recordAutosaveSnapshot } from './autosave.js'
import { setObituaryDrafter } from './obituary.js'
import {
  clearDeathModeStores,
  getCampaignDeathMode,
  getCharacterLifeStatus,
  resolveCharacterDeath,
  setCampaignDeathMode
} from './deathModes.js'
import { clearProgressionStore, getCharacterProgression, setCharacterProgression } from './xp.js'

const CAMPAIGN_ID = 'campaign-death'
const CHARACTER_ID = 'pc-death'

function seedHealthyCharacter(): void {
  persistCharacterMaxHp({
    characterId: CHARACTER_ID,
    hitDie: 8,
    level: 2,
    bodyMod: 1,
    rolls: [6, 5]
  })
  setCharacterProgression(CHARACTER_ID, 2, 40)
}

function seedAutosave(): void {
  recordAutosaveSnapshot(CHARACTER_ID, {
    stats: getCharacterStats(CHARACTER_ID)!,
    progression: getCharacterProgression(CHARACTER_ID),
    recordedAt: '2026-07-26T00:00:00.000Z'
  })
}

function triggerDyingDeathSequence(): void {
  applyHitPointDamage(CHARACTER_ID, 20)
  resolveCharacterDyingSave(CHARACTER_ID, () => 5)
  resolveCharacterDyingSave(CHARACTER_ID, () => 4)
  resolveCharacterDyingSave(CHARACTER_ID, () => 3)
}

function resetDeathStores(): void {
  clearDeathModeStores()
  clearAutosaveStore()
  clearCharacterStatsStore()
  clearProgressionStore()
  setObituaryDrafter(undefined)
}

function buildRespawnConfig(
  overrides: Partial<{
    relocateTo: string
    cost: number
    maxRespawns: number
    currentGold: number
  }> = {}
) {
  return {
    relocateTo: 'shrine-of-dawn',
    cost: 50,
    maxRespawns: 2,
    currentGold: 100,
    ...overrides
  }
}

describe('campaign death mode configuration', () => {
  beforeEach(resetDeathStores)

  it('stores and reads per-campaign death modes', () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'standard')
    expect(getCampaignDeathMode(CAMPAIGN_ID)).toBe('standard')
    expect(getCampaignDeathMode('other-campaign')).toBeUndefined()
  })
})

describe('legendary death resolution', () => {
  beforeEach(resetDeathStores)

  it('marks legendary deaths dead with an attached obituary', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'legendary')
    seedHealthyCharacter()

    const result = await resolveCharacterDeath({
      characterId: CHARACTER_ID,
      campaignId: CAMPAIGN_ID,
      cause: 'crushed by rubble',
      obituaryDraft: 'They held the line.'
    })

    expect(result).toMatchObject({
      mode: 'legendary',
      status: 'dead',
      cause: 'crushed by rubble',
      obituary: 'They held the line.'
    })
    expect(getCharacterLifeStatus(CHARACTER_ID)).toEqual({
      status: 'dead',
      cause: 'crushed by rubble',
      obituary: 'They held the line.'
    })
  })
})

describe('standard death resolution', () => {
  beforeEach(resetDeathStores)

  it('restores the latest autosave for standard deaths unless story-driven', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'standard')
    seedHealthyCharacter()
    seedAutosave()

    applyHitPointDamage(CHARACTER_ID, 12)
    setCharacterProgression(CHARACTER_ID, 1, 0)
    triggerDyingDeathSequence()

    const result = await resolveCharacterDeath({
      characterId: CHARACTER_ID,
      campaignId: CAMPAIGN_ID,
      cause: 'failed dying saves'
    })

    expect(result).toMatchObject({
      mode: 'standard',
      status: 'alive',
      restoredFromAutosave: true
    })
    expect(getCharacterStats(CHARACTER_ID)?.currentHp).toBe(12)
    expect(getCharacterProgression(CHARACTER_ID)).toEqual({ characterId: CHARACTER_ID, level: 2, xp: 40 })
    expect(getCharacterLifeStatus(CHARACTER_ID)).toEqual({ status: 'alive' })
  })

  it('keeps story-driven deaths permanent even in standard mode', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'standard')
    seedHealthyCharacter()
    seedAutosave()

    const result = await resolveCharacterDeath({
      characterId: CHARACTER_ID,
      campaignId: CAMPAIGN_ID,
      cause: 'sacrificed to seal the rift',
      storyDriven: true,
      obituaryDraft: 'The rift closed.'
    })

    expect(result).toMatchObject({
      mode: 'standard',
      status: 'dead',
      cause: 'sacrificed to seal the rift',
      obituary: 'The rift closed.'
    })
    expect(getCharacterLifeStatus(CHARACTER_ID)).toMatchObject({ status: 'dead' })
  })
})

describe('respawn death resolution', () => {
  beforeEach(resetDeathStores)

  it('applies respawn relocate, cost, and limits mechanically', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'respawn')
    seedHealthyCharacter()

    const result = await resolveCharacterDeath({
      characterId: CHARACTER_ID,
      campaignId: CAMPAIGN_ID,
      cause: 'ambush',
      respawnConfig: buildRespawnConfig()
    })

    expect(result).toMatchObject({
      mode: 'respawn',
      status: 'alive',
      respawn: {
        relocatedTo: 'shrine-of-dawn',
        costPaid: 50,
        respawnsUsed: 1,
        respawnsRemaining: 1,
        goldRemaining: 50
      }
    })
    expect(getCharacterLifeStatus(CHARACTER_ID)).toEqual({ status: 'alive' })
  })
})

describe('respawn death guardrails', () => {
  beforeEach(resetDeathStores)

  it('rejects respawn when the respawn limit is exhausted', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'respawn')
    seedHealthyCharacter()
    await resolveCharacterDeath({
      characterId: CHARACTER_ID,
      campaignId: CAMPAIGN_ID,
      cause: 'first death',
      respawnConfig: buildRespawnConfig({ maxRespawns: 1 })
    })

    await expect(
      resolveCharacterDeath({
        characterId: CHARACTER_ID,
        campaignId: CAMPAIGN_ID,
        cause: 'second death',
        respawnConfig: buildRespawnConfig({ maxRespawns: 1 })
      })
    ).rejects.toMatchObject({ code: 'RESPAWN_LIMIT_EXCEEDED' })
  })

  it('rejects respawn when gold is insufficient', async () => {
    setCampaignDeathMode(CAMPAIGN_ID, 'respawn')
    seedHealthyCharacter()

    await expect(
      resolveCharacterDeath({
        characterId: CHARACTER_ID,
        campaignId: CAMPAIGN_ID,
        cause: 'broke',
        respawnConfig: buildRespawnConfig({ cost: 200, currentGold: 50, maxRespawns: 3 })
      })
    ).rejects.toMatchObject({ code: 'RESPAWN_COST_INSUFFICIENT' })
  })
})

describe('death resolution validation', () => {
  beforeEach(resetDeathStores)

  it('requires campaign death mode and respawn config when resolving death', async () => {
    seedHealthyCharacter()

    await expect(
      resolveCharacterDeath({
        characterId: CHARACTER_ID,
        campaignId: CAMPAIGN_ID,
        cause: 'unknown'
      })
    ).rejects.toMatchObject({ code: 'DEATH_MODE_NOT_SET' })

    setCampaignDeathMode(CAMPAIGN_ID, 'respawn')
    await expect(
      resolveCharacterDeath({
        characterId: CHARACTER_ID,
        campaignId: CAMPAIGN_ID,
        cause: 'unknown'
      })
    ).rejects.toMatchObject({ code: 'DEATH_INPUT_INVALID' })
  })
})
