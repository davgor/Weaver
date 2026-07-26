import { computeMaxHp, getAbilityModifier } from '@weaver/character-engine'
import type { AbilityScores, DamageType } from '@weaver/character-engine'
import type {
  BestiaryDamageProfile,
  BestiaryEntry,
  BestiaryHpProfile,
  EnemyDifficulty,
  HydratedBestiaryEntry
} from './types.js'

type SeedEntryInput = Omit<BestiaryEntry, 'hp'> & {
  hp: Omit<BestiaryHpProfile, 'referenceMaxHp'>
}

const SEED_BESTIARY: BestiaryEntry[] = [
  seedEntry({
    bestiaryId: 'goblin-skirmisher',
    speciesId: 'goblin',
    speciesName: 'Goblin',
    variantId: 'skirmisher',
    variantName: 'Skirmisher',
    displayName: 'Goblin Skirmisher',
    description: 'A quick ambusher that fights with blades and short bows.',
    difficulty: 'easy',
    abilityScores: { Body: 8, Agility: 14, Mind: 10, Presence: 8 },
    hp: { hitDie: 6, level: 1, rolls: [4] },
    damageTypes: damage(['Physical'], [], []),
    regions: ['forest', 'hills'],
    tags: ['goblin', 'humanoid', 'forest', 'ambush', 'low']
  }),
  seedEntry({
    bestiaryId: 'skeleton-warrior',
    speciesId: 'skeleton',
    speciesName: 'Skeleton',
    variantId: 'warrior',
    variantName: 'Warrior',
    displayName: 'Skeleton Warrior',
    description: 'An animated guard with brittle bones and a rusted weapon.',
    difficulty: 'medium',
    abilityScores: { Body: 12, Agility: 10, Mind: 6, Presence: 6 },
    hp: { hitDie: 8, level: 2, rolls: [8, 5] },
    damageTypes: damage(['Physical'], ['Cold', 'Poison'], []),
    regions: ['dungeon', 'ruins'],
    tags: ['skeleton', 'undead', 'dungeon', 'guardian']
  }),
  seedEntry({
    bestiaryId: 'ember-drake-wyrmling',
    speciesId: 'ember-drake',
    speciesName: 'Ember Drake',
    variantId: 'wyrmling',
    variantName: 'Wyrmling',
    displayName: 'Ember Drake Wyrmling',
    description: 'A young winged predator with snapping jaws and a burning throat.',
    difficulty: 'hard',
    abilityScores: { Body: 16, Agility: 12, Mind: 8, Presence: 12 },
    hp: { hitDie: 10, level: 3, rolls: [10, 7, 6] },
    damageTypes: damage(['Physical', 'Fire'], ['Fire'], []),
    regions: ['mountain', 'cave'],
    tags: ['ember-drake', 'dragon', 'mountain', 'fire', 'boss']
  })
]

export function listBestiary(): BestiaryEntry[] {
  return SEED_BESTIARY.map(cloneBestiaryEntry)
}

export function getBestiaryEntry(bestiaryId: string): BestiaryEntry | undefined {
  const entry = SEED_BESTIARY.find((candidate) => candidate.bestiaryId === bestiaryId)
  return entry === undefined ? undefined : cloneBestiaryEntry(entry)
}

export function hydrateBestiaryEntry(entry: BestiaryEntry): HydratedBestiaryEntry {
  const max = computeMaxHp(
    entry.hp.hitDie,
    entry.hp.level,
    getAbilityModifier(entry.abilityScores.Body),
    entry.hp.rolls
  )
  return { ...cloneBestiaryWithoutHp(entry), hp: { hitDie: entry.hp.hitDie, level: entry.hp.level, max, current: max } }
}

export function abilityModifiers(scores: AbilityScores): AbilityScores {
  return {
    Body: getAbilityModifier(scores.Body),
    Agility: getAbilityModifier(scores.Agility),
    Mind: getAbilityModifier(scores.Mind),
    Presence: getAbilityModifier(scores.Presence)
  }
}

function seedEntry(input: SeedEntryInput): BestiaryEntry {
  const hp = {
    ...cloneHpProfile(input.hp),
    referenceMaxHp: referenceMaxHp(input.abilityScores, input.hp)
  }
  return { ...cloneBestiaryWithoutHp(input), hp }
}

function referenceMaxHp(scores: AbilityScores, hp: SeedEntryInput['hp']): number {
  return computeMaxHp(hp.hitDie, hp.level, getAbilityModifier(scores.Body), hp.rolls)
}

function damage(
  dealt: DamageType[],
  resisted: DamageType[],
  vulnerable: DamageType[]
): BestiaryDamageProfile {
  return { dealt, resisted, vulnerable }
}

function cloneBestiaryEntry(entry: BestiaryEntry): BestiaryEntry {
  return { ...cloneBestiaryWithoutHp(entry), hp: cloneFullHpProfile(entry.hp) }
}

function cloneFullHpProfile(hp: BestiaryHpProfile): BestiaryHpProfile {
  const base = cloneHpProfile(hp)
  return { ...base, referenceMaxHp: hp.referenceMaxHp }
}

function cloneBestiaryWithoutHp(entry: Omit<BestiaryEntry, 'hp'>): Omit<BestiaryEntry, 'hp'> {
  return {
    ...entry,
    abilityScores: { ...entry.abilityScores },
    damageTypes: cloneDamage(entry.damageTypes),
    regions: [...entry.regions],
    tags: [...entry.tags]
  }
}

function cloneHpProfile(hp: Omit<BestiaryHpProfile, 'referenceMaxHp'>): Omit<BestiaryHpProfile, 'referenceMaxHp'>
function cloneHpProfile(hp: BestiaryHpProfile): BestiaryHpProfile
function cloneHpProfile(hp: BestiaryHpProfile | Omit<BestiaryHpProfile, 'referenceMaxHp'>) {
  const base = { hitDie: hp.hitDie, level: hp.level }
  const withRolls = hp.rolls === undefined ? base : { ...base, rolls: [...hp.rolls] }
  return 'referenceMaxHp' in hp ? { ...withRolls, referenceMaxHp: hp.referenceMaxHp } : withRolls
}

function cloneDamage(damageTypes: BestiaryDamageProfile): BestiaryDamageProfile {
  return {
    dealt: [...damageTypes.dealt],
    resisted: [...damageTypes.resisted],
    vulnerable: [...damageTypes.vulnerable]
  }
}

export function matchesDifficulty(entry: BestiaryEntry, difficulty?: EnemyDifficulty): boolean {
  return difficulty === undefined || entry.difficulty === difficulty
}
