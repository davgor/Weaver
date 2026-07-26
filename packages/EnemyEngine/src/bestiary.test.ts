import { describe, expect, it } from 'vitest'
import {
  getBestiaryEntry,
  hydrateBestiaryEntry,
  listBestiary,
  type BestiaryEntry
} from './index.js'

describe('EnemyEngine bestiary catalog', () => {
  it('seeds at least three species with variants and stat blocks', () => {
    const entries = listBestiary()
    const species = new Set(entries.map((entry) => entry.speciesId))

    expect(species.size).toBeGreaterThanOrEqual(3)
    expect(entries.map((entry) => entry.bestiaryId)).toContain('goblin-skirmisher')
    expect(entries.every((entry) => entry.abilityScores.Body > 0)).toBe(true)
    expect(entries.every((entry) => entry.damageTypes.dealt.length > 0)).toBe(true)
  })

  it('returns defensive copies so callers cannot mutate the seed catalog', () => {
    const [first] = listBestiary()
    expect(first).toBeDefined()
    if (first === undefined) {
      return
    }

    first.tags.push('mutated')

    expect(getBestiaryEntry(first.bestiaryId)?.tags).not.toContain('mutated')
  })

  it('hydrates HP from hit-die inputs instead of trusting reference HP', () => {
    const entry = withReferenceHp('goblin-skirmisher', 1)
    const hydrated = hydrateBestiaryEntry(entry)

    expect(hydrated.hp.max).toBeGreaterThan(entry.hp.referenceMaxHp)
    expect(hydrated.hp.current).toBe(hydrated.hp.max)
    expect(hydrated.hp.hitDie).toBe(entry.hp.hitDie)
  })
})

function withReferenceHp(bestiaryId: string, referenceMaxHp: number): BestiaryEntry {
  const entry = getBestiaryEntry(bestiaryId)
  if (entry === undefined) {
    throw new Error(`Missing bestiary entry: ${bestiaryId}`)
  }
  return { ...entry, hp: { ...entry.hp, referenceMaxHp } }
}
