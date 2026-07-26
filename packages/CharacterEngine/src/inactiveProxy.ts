import { getArchetypePlayKit } from './emergentDirection.js'
import { CharacterEngineError } from './errors.js'
import { getCharacterStats, type CharacterStats } from './hp.js'
import { listKnownActions } from './records.js'
import { getCharacterArchetype } from './startingLoadout.js'

export type InactiveProxyActionRequest = {
  characterId: string
  intentTag: string
}

export type InactiveProxyActionSuggestion = {
  characterId: string
  intentTag: string
  actionId: string | null
  groundedIn: 'known_action' | 'archetype_kit'
  kitTag?: string
  archetype?: string
  stats: CharacterStats
}

export function requestInactiveProxyAction(
  input: InactiveProxyActionRequest
): InactiveProxyActionSuggestion {
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.intentTag, 'intentTag')
  const stats = requireStats(input.characterId)
  const archetype = getCharacterArchetype(input.characterId)
  const knownAction = pickKnownAction(input.characterId, input.intentTag)
  if (knownAction !== undefined) {
    return buildSuggestion(input, stats, knownAction, archetype)
  }
  const kitTag = pickArchetypeKitTag(archetype, input.intentTag)
  return buildKitSuggestion(input, stats, kitTag, archetype)
}

function pickKnownAction(characterId: string, intentTag: string): string | undefined {
  const tag = intentTag.toLowerCase()
  const actions = listKnownActions(characterId)
  return actions.find((actionId) => actionId.toLowerCase().includes(tag))
}

function pickArchetypeKitTag(
  archetype: ReturnType<typeof getCharacterArchetype>,
  intentTag: string
): string {
  if (archetype === undefined) {
    throw new CharacterEngineError('PROXY_INPUT_INVALID', `Unknown character archetype for: ${intentTag}`)
  }
  const kit = getArchetypePlayKit(archetype)
  const tag = intentTag.toLowerCase()
  const exact = kit.find((entry) => entry.toLowerCase() === tag)
  if (exact !== undefined) {
    return exact
  }
  const partial = kit.find((entry) => entry.toLowerCase().includes(tag) || tag.includes(entry.toLowerCase()))
  if (partial !== undefined) {
    return partial
  }
  throw new CharacterEngineError(
    'PROXY_ACTION_UNAVAILABLE',
    `No grounded action or archetype kit tag matches intent: ${intentTag}`
  )
}

function buildSuggestion(
  input: InactiveProxyActionRequest,
  stats: CharacterStats,
  actionId: string,
  archetype: ReturnType<typeof getCharacterArchetype>
): InactiveProxyActionSuggestion {
  return {
    characterId: input.characterId,
    intentTag: input.intentTag,
    actionId,
    groundedIn: 'known_action',
    ...(archetype === undefined ? {} : { archetype }),
    stats
  }
}

function buildKitSuggestion(
  input: InactiveProxyActionRequest,
  stats: CharacterStats,
  kitTag: string,
  archetype: ReturnType<typeof getCharacterArchetype>
): InactiveProxyActionSuggestion {
  return {
    characterId: input.characterId,
    intentTag: input.intentTag,
    actionId: null,
    groundedIn: 'archetype_kit',
    kitTag,
    ...(archetype === undefined ? {} : { archetype }),
    stats
  }
}

function requireStats(characterId: string): CharacterStats {
  const stats = getCharacterStats(characterId)
  if (stats === undefined) {
    throw new CharacterEngineError('PROXY_INPUT_INVALID', `Unknown characterId: ${characterId}`)
  }
  return stats
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('PROXY_INPUT_INVALID', `${label} must not be empty`)
  }
}
