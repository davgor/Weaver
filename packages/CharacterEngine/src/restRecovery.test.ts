import { beforeEach, describe, expect, it } from 'vitest'
import {
  CONDITIONS,
  applyHitPointDamage,
  clearCharacterStatsStore,
  getCampaignDay,
  getCharacterStats,
  listRestClearableConditions,
  persistCharacterMaxHp,
  previewLongRest,
  restoreCharacterStats,
  REST_CLEARABLE_CONDITIONS,
  REST_STICKY_CONDITIONS,
  setCampaignDay
} from './index.js'

describe('rest-clearable condition table', () => {
  it('exports a unit-tested clearable set covering Unconscious and combat malaise', () => {
    expect(listRestClearableConditions()).toEqual([...REST_CLEARABLE_CONDITIONS])
    expect(REST_CLEARABLE_CONDITIONS).toEqual(['Prone', 'Stunned', 'Poisoned', 'Unconscious'])
  })

  it('lists every catalog condition as either clearable or sticky', () => {
    const partitioned = new Set([...REST_CLEARABLE_CONDITIONS, ...REST_STICKY_CONDITIONS])
    expect([...partitioned].sort()).toEqual([...CONDITIONS].sort())
    expect(REST_STICKY_CONDITIONS).toEqual(['Restrained'])
    expect(REST_CLEARABLE_CONDITIONS).not.toContain('Restrained')
  })
})

describe('previewLongRest', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
    setCampaignDay('campaign-preview-rest', 3)
  })

  it('reports next day and per-character recovery deltas without mutating stores', () => {
    persistCharacterMaxHp({
      characterId: 'pc-preview',
      hitDie: 8,
      level: 1,
      bodyMod: 2
    })
    applyHitPointDamage('pc-preview', 7)
    restoreCharacterStats({
      ...getCharacterStats('pc-preview')!,
      conditions: ['Poisoned', 'Restrained', 'Stunned']
    })

    const before = getCharacterStats('pc-preview')!
    const preview = previewLongRest({
      campaignId: 'campaign-preview-rest',
      characterIds: ['pc-preview', 'pc-missing']
    })

    expect(preview).toEqual({
      campaignId: 'campaign-preview-rest',
      day: 4,
      characters: [
        {
          characterId: 'pc-preview',
          fromHp: before.currentHp,
          toHp: before.maxHp,
          clearedConditions: ['Stunned', 'Poisoned'],
          clearsDying: false
        }
      ]
    })
    expect(getCampaignDay('campaign-preview-rest')).toBe(3)
    expect(getCharacterStats('pc-preview')).toEqual(before)
  })

  it('includes dying/Unconscious clearance in the preview shape', () => {
    persistCharacterMaxHp({
      characterId: 'pc-dying-preview',
      hitDie: 8,
      level: 1,
      bodyMod: 0
    })
    applyHitPointDamage('pc-dying-preview', 8)

    const preview = previewLongRest({
      campaignId: 'campaign-preview-rest',
      characterIds: ['pc-dying-preview']
    })

    expect(preview.characters[0]).toMatchObject({
      characterId: 'pc-dying-preview',
      fromHp: 0,
      toHp: 8,
      clearedConditions: ['Prone', 'Unconscious'],
      clearsDying: true
    })
    expect(getCharacterStats('pc-dying-preview')?.dying).not.toBeNull()
  })
})
