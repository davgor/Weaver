import { describe, expect, it } from 'vitest'
import { computeMaxHp, getCharacterStats, persistCharacterMaxHp } from './index.js'

describe('hit-point model', () => {
  it('computes level-1 HP from hit die plus Body modifier', () => {
    expect(computeMaxHp(8, 1, 2)).toBe(10)
  })

  it('accumulates per-level hit-die contributions and applies Body modifier once', () => {
    expect(computeMaxHp(8, 3, 2, [8, 5, 6])).toBe(21)
  })

  it('uses fixed hit-die contributions when rolls are not supplied', () => {
    expect(computeMaxHp(6, 2, -1)).toBe(11)
  })

  it('persists maxHp for later reads instead of recomputing on access', () => {
    const stats = persistCharacterMaxHp({
      characterId: 'pc-hp-persist',
      hitDie: 10,
      level: 2,
      bodyMod: 1,
      rolls: [9, 7]
    })

    expect(stats.maxHp).toBe(17)
    expect(getCharacterStats('pc-hp-persist')).toEqual(stats)
  })
})
