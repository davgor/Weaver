export const ARCHETYPE_IDS = ['Fighter', 'Rogue', 'Mage', 'Cleric', 'Ranger'] as const

export type ArchetypeId = (typeof ARCHETYPE_IDS)[number]

export const ARCHETYPE_MIN_LEVEL = 1
export const ARCHETYPE_MAX_LEVEL = 20

export type ArchetypeDefinition = {
  id: ArchetypeId
  name: string
  minLevel: number
  maxLevel: number
  hitDie: number
}

const ARCHETYPE_DEFINITIONS: Readonly<Record<ArchetypeId, ArchetypeDefinition>> = {
  Fighter: {
    id: 'Fighter',
    name: 'Fighter',
    minLevel: ARCHETYPE_MIN_LEVEL,
    maxLevel: ARCHETYPE_MAX_LEVEL,
    hitDie: 10
  },
  Rogue: {
    id: 'Rogue',
    name: 'Rogue',
    minLevel: ARCHETYPE_MIN_LEVEL,
    maxLevel: ARCHETYPE_MAX_LEVEL,
    hitDie: 8
  },
  Mage: {
    id: 'Mage',
    name: 'Mage',
    minLevel: ARCHETYPE_MIN_LEVEL,
    maxLevel: ARCHETYPE_MAX_LEVEL,
    hitDie: 6
  },
  Cleric: {
    id: 'Cleric',
    name: 'Cleric',
    minLevel: ARCHETYPE_MIN_LEVEL,
    maxLevel: ARCHETYPE_MAX_LEVEL,
    hitDie: 8
  },
  Ranger: {
    id: 'Ranger',
    name: 'Ranger',
    minLevel: ARCHETYPE_MIN_LEVEL,
    maxLevel: ARCHETYPE_MAX_LEVEL,
    hitDie: 10
  }
}

export function listArchetypes(): ArchetypeDefinition[] {
  return ARCHETYPE_IDS.map((id) => ({ ...ARCHETYPE_DEFINITIONS[id] }))
}

export function getArchetype(id: ArchetypeId): ArchetypeDefinition {
  return { ...ARCHETYPE_DEFINITIONS[id] }
}

export function isArchetypeId(value: unknown): value is ArchetypeId {
  return typeof value === 'string' && ARCHETYPE_IDS.some((entry) => entry === value)
}

export function assertArchetypeLevel(level: number): number {
  if (!Number.isInteger(level) || level < ARCHETYPE_MIN_LEVEL || level > ARCHETYPE_MAX_LEVEL) {
    throw new Error(
      `Archetype level must be an integer from ${ARCHETYPE_MIN_LEVEL} to ${ARCHETYPE_MAX_LEVEL}`
    )
  }
  return level
}
