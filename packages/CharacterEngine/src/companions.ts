import { getArchetype, isArchetypeId, type ArchetypeId } from './archetypes.js'
import { getCharacterFactStore } from './campaignFactStore.js'
import { CharacterEngineError } from './errors.js'
import { persistCharacterMaxHp } from './hp.js'
import { selectStartingLoadout, getCharacterStartingLoadout } from './startingLoadout.js'

export type CompanionOnboardingStatus = 'pending' | 'skipped' | 'completed'

export type CompanionRecord = {
  characterId: string
  ownerCharacterId: string
  campaignId: string
  name: string
  isCompanion: true
  archetype: ArchetypeId
}

export type CreateCompanionInput = {
  ownerCharacterId: string
  campaignId: string
  name: string
  archetype: ArchetypeId
  bodyMod?: number
  level?: number
}

export function getCompanionOnboardingStatus(
  ownerCharacterId: string
): CompanionOnboardingStatus | undefined {
  const explicit = getCharacterFactStore().getOnboardingStatus(ownerCharacterId)
  if (explicit !== undefined) {
    return explicit
  }
  if (getCharacterStartingLoadout(ownerCharacterId) !== undefined) {
    return 'pending'
  }
  return undefined
}

export function markCompanionOnboardingPending(ownerCharacterId: string): CompanionOnboardingStatus {
  assertNonEmpty(ownerCharacterId, 'ownerCharacterId')
  const store = getCharacterFactStore()
  if (store.getOnboardingStatus(ownerCharacterId) === undefined) {
    store.setOnboardingStatus(ownerCharacterId, 'pending')
  }
  return store.getOnboardingStatus(ownerCharacterId)!
}

export function skipCompanionCreation(ownerCharacterId: string): CompanionOnboardingStatus {
  assertOwnerReadyForCompanionStep(ownerCharacterId)
  getCharacterFactStore().setOnboardingStatus(ownerCharacterId, 'skipped')
  return 'skipped'
}

export function createCompanion(input: CreateCompanionInput): CompanionRecord {
  assertCreateInput(input)
  assertOwnerReadyForCompanionStep(input.ownerCharacterId)
  const archetype = getArchetype(input.archetype)
  const level = input.level ?? 1
  const bodyMod = input.bodyMod ?? 0
  const characterId = getCharacterFactStore().allocateCompanionId()
  const record: CompanionRecord = {
    characterId,
    ownerCharacterId: input.ownerCharacterId,
    campaignId: input.campaignId,
    name: input.name.trim(),
    isCompanion: true,
    archetype: input.archetype
  }
  getCharacterFactStore().setCompanion(record)
  selectStartingLoadout(characterId, input.archetype, level)
  persistCharacterMaxHp({
    characterId,
    hitDie: archetype.hitDie,
    level,
    bodyMod
  })
  getCharacterFactStore().setOnboardingStatus(input.ownerCharacterId, 'completed')
  return copyCompanion(record)
}

export function listCompanions(ownerCharacterId: string): CompanionRecord[] {
  assertNonEmpty(ownerCharacterId, 'ownerCharacterId')
  const store = getCharacterFactStore()
  return store.listCompanionIdsForOwner(ownerCharacterId).map((id) => copyCompanion(requireCompanion(id)))
}

export function getCompanion(characterId: string): CompanionRecord | undefined {
  const record = getCharacterFactStore().getCompanion(characterId)
  return record === undefined ? undefined : copyCompanion(record)
}

export function isCompanionCharacter(characterId: string): boolean {
  return getCharacterFactStore().getCompanion(characterId) !== undefined
}

export function clearCompanionStore(): void {
  getCharacterFactStore().clearCompanions()
}

export function listCompanionsForCampaign(campaignId: string): CompanionRecord[] {
  return getCharacterFactStore().listCompanionsForCampaign(campaignId).map(copyCompanion)
}

export function clearCompanionsForCampaign(campaignId: string): void {
  getCharacterFactStore().clearCompanionsForCampaign(campaignId)
}

export function restoreCompanionsForCampaign(records: readonly CompanionRecord[]): void {
  for (const record of records) {
    getCharacterFactStore().setCompanion(copyCompanion(record))
  }
}

function assertCreateInput(input: CreateCompanionInput): void {
  assertNonEmpty(input.ownerCharacterId, 'ownerCharacterId')
  assertNonEmpty(input.campaignId, 'campaignId')
  assertNonEmpty(input.name, 'name')
  if (!isArchetypeId(input.archetype)) {
    throw new CharacterEngineError('COMPANION_INPUT_INVALID', `Unknown archetype: ${input.archetype}`)
  }
}

function assertOwnerReadyForCompanionStep(ownerCharacterId: string): void {
  assertNonEmpty(ownerCharacterId, 'ownerCharacterId')
  if (getCharacterStartingLoadout(ownerCharacterId) === undefined) {
    throw new CharacterEngineError(
      'COMPANION_STEP_INVALID',
      'Companion creation requires post-equipment loadout on owner character'
    )
  }
  markCompanionOnboardingPending(ownerCharacterId)
}

function requireCompanion(characterId: string): CompanionRecord {
  const record = getCharacterFactStore().getCompanion(characterId)
  if (record === undefined) {
    throw new CharacterEngineError('COMPANION_NOT_FOUND', `Unknown companion: ${characterId}`)
  }
  return record
}

function copyCompanion(record: CompanionRecord): CompanionRecord {
  return { ...record }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('COMPANION_INPUT_INVALID', `${label} must not be empty`)
  }
}
