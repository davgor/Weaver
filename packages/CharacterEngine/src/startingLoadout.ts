import {
  getStartingLoadout,
  type StartingLoadout,
  type StartingLoadoutItem
} from '@weaver/item-engine'
import {
  ARCHETYPE_MIN_LEVEL,
  assertArchetypeLevel,
  isArchetypeId,
  type ArchetypeId
} from './archetypes.js'
import { CharacterEngineError } from './errors.js'
import { learnKnownAction } from './records.js'

export type PersistedStartingLoadout = {
  characterId: string
  archetype: ArchetypeId
  level: number
  catalogVersion: string
  items: StartingLoadoutItem[]
  actionIds: string[]
}

const loadoutStore = new Map<string, PersistedStartingLoadout>()
const archetypeStore = new Map<string, ArchetypeId>()

export function resolveDefaultStartingLoadout(archetype: ArchetypeId): StartingLoadout {
  assertArchetype(archetype)
  return getStartingLoadout(archetype)
}

export function selectStartingLoadout(
  characterId: string,
  archetype: ArchetypeId,
  level: number = ARCHETYPE_MIN_LEVEL
): PersistedStartingLoadout {
  assertNonEmpty(characterId, 'characterId')
  assertArchetype(archetype)
  assertArchetypeLevel(level)
  const catalog = resolveDefaultStartingLoadout(archetype)
  for (const actionId of catalog.actionIds) {
    learnKnownAction(characterId, actionId)
  }
  const persisted: PersistedStartingLoadout = {
    characterId,
    archetype,
    level,
    catalogVersion: catalog.catalogVersion,
    items: catalog.items.map((item) => ({ ...item })),
    actionIds: [...catalog.actionIds]
  }
  loadoutStore.set(characterId, persisted)
  archetypeStore.set(characterId, archetype)
  return copyLoadout(persisted)
}

export function getCharacterStartingLoadout(
  characterId: string
): PersistedStartingLoadout | undefined {
  const loadout = loadoutStore.get(characterId)
  return loadout === undefined ? undefined : copyLoadout(loadout)
}

export function getCharacterArchetype(characterId: string): ArchetypeId | undefined {
  return archetypeStore.get(characterId)
}

export function clearStartingLoadoutStore(): void {
  loadoutStore.clear()
  archetypeStore.clear()
}

function assertArchetype(archetype: ArchetypeId): void {
  if (!isArchetypeId(archetype)) {
    throw new CharacterEngineError('ARCHETYPE_INPUT_INVALID', `Unknown archetype: ${archetype}`)
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('LOADOUT_INPUT_INVALID', `${label} must not be empty`)
  }
}

function copyLoadout(loadout: PersistedStartingLoadout): PersistedStartingLoadout {
  return {
    characterId: loadout.characterId,
    archetype: loadout.archetype,
    level: loadout.level,
    catalogVersion: loadout.catalogVersion,
    items: loadout.items.map((item) => ({ ...item })),
    actionIds: [...loadout.actionIds]
  }
}
