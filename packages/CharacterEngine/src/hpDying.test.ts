import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyHitPointDamage,
  clearCharacterStatsStore,
  getCharacterStats,
  healHitPoints,
  persistCharacterMaxHp,
  resolveCharacterDyingSave
} from './hp.js'

describe('zero-HP unconscious entry', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('enters Unconscious and starts dying saves at 0 HP', () => {
    persistCharacterMaxHp({
      characterId: 'pc-dying',
      hitDie: 8,
      level: 1,
      bodyMod: 2
    })

    const stats = applyHitPointDamage('pc-dying', 10)

    expect(stats).toMatchObject({
      currentHp: 0,
      maxHp: 10,
      conditions: expect.arrayContaining(['Unconscious', 'Prone']),
      dying: { successes: 0, failures: 0, stable: false }
    })
    expect(getCharacterStats('pc-dying')).toEqual(stats)
  })

  it('only losing the dying sequence marks death-mode resolution', () => {
    persistCharacterMaxHp({
      characterId: 'pc-death-mode',
      hitDie: 8,
      level: 1,
      bodyMod: 0
    })
    applyHitPointDamage('pc-death-mode', 8)

    const first = resolveCharacterDyingSave('pc-death-mode', () => 5)
    const second = resolveCharacterDyingSave('pc-death-mode', () => 4)
    const third = resolveCharacterDyingSave('pc-death-mode', () => 3)

    expect(first.requiresDeathModeResolution).toBe(false)
    expect(second.requiresDeathModeResolution).toBe(false)
    expect(third.requiresDeathModeResolution).toBe(true)
    expect(third.stats.dying).toMatchObject({ failures: 3, stable: false })
  })
})

describe('zero-HP revive and heal', () => {
  beforeEach(() => {
    clearCharacterStatsStore()
  })

  it('revives on a natural 20 dying save and clears Unconscious', () => {
    persistCharacterMaxHp({
      characterId: 'pc-revive',
      hitDie: 8,
      level: 1,
      bodyMod: 1
    })
    applyHitPointDamage('pc-revive', 9)

    const result = resolveCharacterDyingSave('pc-revive', () => 20)

    expect(result).toMatchObject({
      revived: true,
      requiresDeathModeResolution: false,
      stats: {
        currentHp: 1,
        dying: null,
        conditions: expect.not.arrayContaining(['Unconscious'])
      }
    })
  })

  it('clears dying state when healed above 0 HP', () => {
    persistCharacterMaxHp({
      characterId: 'pc-heal',
      hitDie: 8,
      level: 1,
      bodyMod: 0
    })
    applyHitPointDamage('pc-heal', 8)

    const healed = healHitPoints('pc-heal', 3)

    expect(healed).toMatchObject({
      currentHp: 3,
      dying: null,
      conditions: expect.not.arrayContaining(['Unconscious'])
    })
  })
})
