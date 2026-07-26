import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyHitPointDamage,
  characterEngine,
  clearCharacterStatsStore,
  getCampaignDay,
  getCharacterStats,
  longRest,
  persistCharacterMaxHp,
  previewLongRest,
  restoreCharacterStats,
  setCampaignDay
} from '../index.js'

/**
 * Pins rest recovery through published helpers + endpoints against the real
 * HP/conditions store (no mocks of CharacterEngine's own HP API).
 *
 * DMEngine does not yet orchestrate longRest in production paths; intended
 * call shape is `longRest({ campaignId, characterIds? })` / matching
 * `characterEngine.call('longRest', …)`. Day-counter consumer coverage lives
 * in DMEngine's characterEngine.dayCounter.contract.test.ts.
 */
describe('CharacterEngine rest recovery contract', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
    setCampaignDay('campaign-rest-contract', 5)
  })

  it('recovers HP and rest-clearable conditions through published longRest', () => {
    persistCharacterMaxHp({
      characterId: 'pc-contract',
      hitDie: 8,
      level: 1,
      bodyMod: 2
    })
    applyHitPointDamage('pc-contract', 10)
    restoreCharacterStats({
      ...getCharacterStats('pc-contract')!,
      conditions: ['Unconscious', 'Prone', 'Poisoned', 'Restrained']
    })

    const result = longRest({
      campaignId: 'campaign-rest-contract',
      characterIds: ['pc-contract']
    })

    expect(result.day).toBe(6)
    expect(getCampaignDay('campaign-rest-contract')).toBe(6)
    expect(getCharacterStats('pc-contract')).toMatchObject({
      currentHp: 10,
      dying: null,
      conditions: ['Restrained']
    })
  })

  it('exposes longRest and previewLongRest on the endpoint surface', async () => {
    persistCharacterMaxHp({
      characterId: 'pc-endpoint',
      hitDie: 8,
      level: 1,
      bodyMod: 0
    })
    applyHitPointDamage('pc-endpoint', 3)

    const preview = await characterEngine.call('previewLongRest', {
      campaignId: 'campaign-rest-contract',
      characterIds: ['pc-endpoint']
    })
    expect(preview).toEqual(
      previewLongRest({
        campaignId: 'campaign-rest-contract',
        characterIds: ['pc-endpoint']
      })
    )
    expect(getCampaignDay('campaign-rest-contract')).toBe(5)
    expect(getCharacterStats('pc-endpoint')?.currentHp).toBe(5)

    const applied = await characterEngine.call('longRest', {
      campaignId: 'campaign-rest-contract',
      characterIds: ['pc-endpoint']
    })
    expect(applied).toMatchObject({ day: 6 })
    expect(getCharacterStats('pc-endpoint')?.currentHp).toBe(8)
  })
})
