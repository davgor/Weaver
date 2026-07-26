import { describe, expect, it } from 'vitest'
import {
  ARCHETYPE_IDS,
  ARCHETYPE_MAX_LEVEL,
  ARCHETYPE_MIN_LEVEL,
  getArchetype,
  isArchetypeId,
  listArchetypes
} from './archetypes.js'

describe('CharacterEngine archetypes', () => {
  it('exposes five stable archetype keys spanning levels 1–20', () => {
    expect(ARCHETYPE_IDS).toEqual(['Fighter', 'Rogue', 'Mage', 'Cleric', 'Ranger'])
    expect(listArchetypes()).toHaveLength(5)

    for (const id of ARCHETYPE_IDS) {
      expect(isArchetypeId(id)).toBe(true)
      const archetype = getArchetype(id)
      expect(archetype).toMatchObject({
        id,
        name: id,
        minLevel: ARCHETYPE_MIN_LEVEL,
        maxLevel: ARCHETYPE_MAX_LEVEL
      })
      expect(archetype.hitDie).toBeGreaterThanOrEqual(6)
      expect(archetype.minLevel).toBe(1)
      expect(archetype.maxLevel).toBe(20)
    }

    expect(isArchetypeId('Barbarian')).toBe(false)
  })
})
