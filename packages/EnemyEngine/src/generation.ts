import { abilityModifiers, getBestiaryEntry, hydrateBestiaryEntry, listBestiary, matchesDifficulty } from './bestiary.js'
import { saveGeneratedFoe } from './store.js'
import type {
  BestiaryDamageProfile,
  BestiaryEntry,
  EnemyCombatantSnapshot,
  GenerateEncounterFoesInput,
  GeneratedFoeRef,
  QuestFoeAssignment,
  QuestFoeAssignmentInput
} from './types.js'

const DEFAULT_FOE_COUNT = 1

export function generateEncounterFoes(input: GenerateEncounterFoesInput = {}): GeneratedFoeRef[] {
  const count = normalizeCount(input.count)
  const candidates = selectCandidates(input)
  return Array.from({ length: count }, (_, index) => {
    const entry = candidates[index % candidates.length]
    if (entry === undefined) {
      throw new Error('Bestiary catalog is empty.')
    }
    return saveGeneratedFoe(buildFoeRef(entry, input, index))
  })
}

export function assignQuestFoes(input: QuestFoeAssignmentInput): QuestFoeAssignment {
  assertText(input.questId, 'questId')
  const foeRefs = input.bestiaryIds.map((bestiaryId, index) => {
    const entry = requireBestiaryEntry(bestiaryId)
    return saveGeneratedFoe({
      foeId: `${input.questId}-foe-${index + 1}`,
      bestiaryId: entry.bestiaryId,
      difficulty: entry.difficulty,
      tags: [...entry.tags]
    })
  })
  return { questId: input.questId, foeRefs }
}

export function hydrateCombatantFromFoe(foe: GeneratedFoeRef): EnemyCombatantSnapshot {
  const entry = requireBestiaryEntry(foe.bestiaryId)
  const hydrated = hydrateBestiaryEntry(entry)
  return {
    id: foe.foeId,
    bestiaryId: entry.bestiaryId,
    speciesId: entry.speciesId,
    variantId: entry.variantId,
    name: entry.displayName,
    abilities: {
      scores: { ...entry.abilityScores },
      modifiers: abilityModifiers(entry.abilityScores)
    },
    hp: { ...hydrated.hp },
    damageTypes: cloneDamage(entry.damageTypes),
    tags: [...entry.tags],
    ...(foe.combatToken === undefined ? {} : { combatToken: { ...foe.combatToken } })
  }
}

function selectCandidates(input: GenerateEncounterFoesInput): BestiaryEntry[] {
  const entries = listBestiary()
  const scoped = entries.filter((entry) => matchesScope(entry, input))
  if (scoped.length > 0) {
    return scoped
  }
  return entries.filter((entry) => matchesDifficulty(entry, input.difficulty))
}

function matchesScope(entry: BestiaryEntry, input: GenerateEncounterFoesInput): boolean {
  return matchesDifficulty(entry, input.difficulty) && matchesRegion(entry, input.regionId) && matchesTags(entry, input.tags)
}

function matchesRegion(entry: BestiaryEntry, regionId?: string): boolean {
  return regionId === undefined || entry.regions.includes(regionId)
}

function matchesTags(entry: BestiaryEntry, tags?: readonly string[]): boolean {
  return tags === undefined || tags.every((tag) => entry.tags.includes(tag))
}

function buildFoeRef(
  entry: BestiaryEntry,
  input: GenerateEncounterFoesInput,
  index: number
): GeneratedFoeRef {
  const scope = [input.regionId ?? 'any', input.difficulty ?? entry.difficulty, ...(input.tags ?? [])]
  const base = {
    foeId: `${slug(scope.join('-'))}-${entry.bestiaryId}-${index + 1}`,
    bestiaryId: entry.bestiaryId,
    difficulty: entry.difficulty,
    tags: [...entry.tags]
  }
  return input.regionId === undefined ? base : { ...base, regionId: input.regionId }
}

function requireBestiaryEntry(bestiaryId: string): BestiaryEntry {
  const entry = getBestiaryEntry(bestiaryId)
  if (entry === undefined) {
    throw new Error(`Unknown bestiary id: ${bestiaryId}`)
  }
  return entry
}

function normalizeCount(count: number | undefined): number {
  if (count === undefined) {
    return DEFAULT_FOE_COUNT
  }
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('count must be a positive integer')
  }
  return count
}

function cloneDamage(damageTypes: BestiaryDamageProfile): BestiaryDamageProfile {
  return {
    dealt: [...damageTypes.dealt],
    resisted: [...damageTypes.resisted],
    vulnerable: [...damageTypes.vulnerable]
  }
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function slug(value: string): string {
  return value.replace(/[^a-z0-9-]+/gi, '-').toLowerCase()
}
