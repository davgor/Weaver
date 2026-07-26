import { beforeEach, describe, expect, it } from 'vitest'
import {
  DIFFICULTY_BANDS,
  awardXp,
  clearProgressionStore,
  computeXpAward,
  getCharacterProgression,
  getLevelSpanXp,
  getXpThresholdForLevel,
  isDifficultyBand,
  setCharacterProgression
} from './xp.js'

describe('xp difficulty bands and level span', () => {
  it('exposes five engine-owned difficulty bands from easy through impossible', () => {
    expect(DIFFICULTY_BANDS).toEqual(['easy', 'medium', 'hard', 'deadly', 'impossible'])
    for (const band of DIFFICULTY_BANDS) {
      expect(isDifficultyBand(band)).toBe(true)
    }
    expect(isDifficultyBand('trivial')).toBe(false)
  })

  it('uses an engine-owned level-span table for levels 1–20', () => {
    expect(getLevelSpanXp(1)).toBe(100)
    expect(getLevelSpanXp(5)).toBe(500)
    expect(getLevelSpanXp(19)).toBe(1900)
    expect(getXpThresholdForLevel(1)).toBe(0)
    expect(getXpThresholdForLevel(2)).toBe(100)
    expect(getXpThresholdForLevel(3)).toBe(300)
  })

  it('applies fixed fractions of the current level span per difficulty band', () => {
    expect(computeXpAward('easy', 4)).toBe(20)
    expect(computeXpAward('medium', 4)).toBe(60)
    expect(computeXpAward('hard', 4)).toBe(120)
    expect(computeXpAward('deadly', 4)).toBe(200)
    expect(computeXpAward('impossible', 4)).toBe(400)
  })
})

describe('character xp progression store', () => {
  beforeEach(() => {
    clearProgressionStore()
  })

  it('awards xp and levels up when the threshold is met', () => {
    const first = awardXp('pc-xp', 'impossible')
    expect(first).toMatchObject({ characterId: 'pc-xp', level: 2, xp: 0, xpAwarded: 100 })

    const progression = getCharacterProgression('pc-xp')
    expect(progression).toMatchObject({ level: 2, xp: 0 })
  })

  it('carries overflow xp across multiple level-ups in one award', () => {
    setCharacterProgression('pc-overflow', 1, 0)
    awardXp('pc-overflow', 'impossible')
    setCharacterProgression('pc-overflow', 2, 150)
    const result = awardXp('pc-overflow', 'impossible')
    expect(result).toMatchObject({ level: 3, xp: 150, xpAwarded: 200 })
  })
})
