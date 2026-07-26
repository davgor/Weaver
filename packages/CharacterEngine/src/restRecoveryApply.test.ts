import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyHitPointDamage,
  clearCharacterStatsStore,
  getCampaignDay,
  getCharacterStats,
  longRest,
  persistCharacterMaxHp,
  restoreCharacterStats,
  setCampaignDay
} from './index.js'

beforeEach(() => {
  clearCharacterStatsStore()
  setCampaignDay('campaign-long-rest', 2)
})

describe('longRest recovery apply', () => {
  it('advances day by 1 and recovers listed characters', () => {
    persistCharacterMaxHp({
      characterId: 'pc-hurt',
      hitDie: 8,
      level: 1,
      bodyMod: 2
    })
    applyHitPointDamage('pc-hurt', 6)
    restoreCharacterStats({
      ...getCharacterStats('pc-hurt')!,
      conditions: ['Poisoned', 'Restrained']
    })

    const result = longRest({
      campaignId: 'campaign-long-rest',
      characterIds: ['pc-hurt']
    })

    expect(result).toMatchObject({ campaignId: 'campaign-long-rest', day: 3 })
    expect(getCampaignDay('campaign-long-rest')).toBe(3)
    expect(getCharacterStats('pc-hurt')).toMatchObject({
      currentHp: 10,
      maxHp: 10,
      dying: null,
      conditions: ['Restrained']
    })
  })

  it('clears dying and rest-clearable conditions including Unconscious', () => {
    persistCharacterMaxHp({
      characterId: 'pc-dying',
      hitDie: 8,
      level: 1,
      bodyMod: 0
    })
    applyHitPointDamage('pc-dying', 8)

    longRest({
      campaignId: 'campaign-long-rest',
      characterIds: ['pc-dying']
    })

    expect(getCharacterStats('pc-dying')).toMatchObject({
      currentHp: 8,
      dying: null,
      conditions: []
    })
  })
})

describe('longRest compatibility edges', () => {
  it('skips characters without stats and still advances the day', () => {
    const result = longRest({
      campaignId: 'campaign-long-rest',
      characterIds: ['pc-travel-only']
    })

    expect(result.day).toBe(3)
    expect(result.recovered).toEqual([])
    expect(getCharacterStats('pc-travel-only')).toBeUndefined()
  })

  it('advances the day with empty or omitted characterIds and recovers nobody', () => {
    persistCharacterMaxHp({
      characterId: 'pc-ignored',
      hitDie: 8,
      level: 1,
      bodyMod: 1
    })
    applyHitPointDamage('pc-ignored', 3)

    expect(longRest({ campaignId: 'campaign-long-rest' })).toMatchObject({
      day: 3,
      recovered: []
    })
    expect(longRest({ campaignId: 'campaign-long-rest', characterIds: [] })).toMatchObject({
      day: 4,
      recovered: []
    })
    expect(getCharacterStats('pc-ignored')?.currentHp).toBe(6)
  })

  it('accepts a legacy string campaignId as day-only rest', () => {
    expect(longRest('campaign-long-rest')).toEqual({
      campaignId: 'campaign-long-rest',
      day: 3,
      recovered: []
    })
  })
})
