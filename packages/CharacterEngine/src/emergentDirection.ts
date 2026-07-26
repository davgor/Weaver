import { type ArchetypeId } from './archetypes.js'
import { CharacterEngineError } from './errors.js'
import { type FeatureKind, type FeatureTemplateId } from './featureTemplates.js'

export const EMERGENT_PATTERN_THRESHOLD = 5

export type EmergentDirection = {
  templateId: FeatureTemplateId
  kind: FeatureKind
  playTag: string
}

const ARCHETYPE_PLAY_KITS: Readonly<Record<ArchetypeId, readonly string[]>> = {
  Fighter: ['melee', 'defense', 'physical'],
  Rogue: ['stealth', 'finesse', 'melee'],
  Mage: ['spell', 'arcane'],
  Cleric: ['divine', 'healing', 'spell'],
  Ranger: ['ranged', 'nature', 'tracking']
}

const patternCounts = new Map<string, Map<string, number>>()
const grantedEmergent = new Set<string>()

export function getArchetypePlayKit(archetype: ArchetypeId): readonly string[] {
  return [...ARCHETYPE_PLAY_KITS[archetype]]
}

export function recordTaggedPlayPattern(characterId: string, tag: string): number {
  assertNonEmpty(characterId, 'characterId')
  assertNonEmpty(tag, 'tag')
  const counts = readPatternCounts(characterId)
  const next = (counts.get(tag) ?? 0) + 1
  counts.set(tag, next)
  return next
}

export function detectEmergentDirection(
  characterId: string,
  archetype: ArchetypeId
): EmergentDirection | undefined {
  if (grantedEmergent.has(characterId)) {
    return readCachedEmergent(characterId)
  }
  const tag = findEmergentTag(characterId, archetype)
  if (tag === undefined) {
    return undefined
  }
  const direction: EmergentDirection = {
    templateId: 'emergent.custom_passive',
    kind: 'custom_feature',
    playTag: tag
  }
  cacheEmergent(characterId, direction)
  return direction
}

export function markEmergentDirectionGranted(characterId: string): void {
  grantedEmergent.add(characterId)
}

export function clearEmergentDirectionStore(): void {
  patternCounts.clear()
  grantedEmergent.clear()
  emergentCache.clear()
}

const emergentCache = new Map<string, EmergentDirection>()

function findEmergentTag(characterId: string, archetype: ArchetypeId): string | undefined {
  const kit = new Set(ARCHETYPE_PLAY_KITS[archetype])
  const counts = patternCounts.get(characterId)
  if (counts === undefined) {
    return undefined
  }
  const candidates = [...counts.entries()]
    .filter(([tag, count]) => count >= EMERGENT_PATTERN_THRESHOLD && !kit.has(tag))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  return candidates[0]?.[0]
}

function readPatternCounts(characterId: string): Map<string, number> {
  const existing = patternCounts.get(characterId)
  if (existing !== undefined) {
    return existing
  }
  const created = new Map<string, number>()
  patternCounts.set(characterId, created)
  return created
}

function cacheEmergent(characterId: string, direction: EmergentDirection): void {
  emergentCache.set(characterId, direction)
}

function readCachedEmergent(characterId: string): EmergentDirection | undefined {
  return emergentCache.get(characterId)
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('EMERGENT_INPUT_INVALID', `${label} must not be empty`)
  }
}
