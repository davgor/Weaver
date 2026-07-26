import { getArchetype, isArchetypeId, type ArchetypeId } from './archetypes.js'
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

const companionRecords = new Map<string, CompanionRecord>()
const companionsByOwner = new Map<string, string[]>()
const onboardingStatus = new Map<string, CompanionOnboardingStatus>()
let nextCompanionId = 1

export function getCompanionOnboardingStatus(
  ownerCharacterId: string
): CompanionOnboardingStatus | undefined {
  const explicit = onboardingStatus.get(ownerCharacterId)
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
  if (!onboardingStatus.has(ownerCharacterId)) {
    onboardingStatus.set(ownerCharacterId, 'pending')
  }
  return onboardingStatus.get(ownerCharacterId)!
}

export function skipCompanionCreation(ownerCharacterId: string): CompanionOnboardingStatus {
  assertOwnerReadyForCompanionStep(ownerCharacterId)
  onboardingStatus.set(ownerCharacterId, 'skipped')
  return 'skipped'
}

export function createCompanion(input: CreateCompanionInput): CompanionRecord {
  assertCreateInput(input)
  assertOwnerReadyForCompanionStep(input.ownerCharacterId)
  const archetype = getArchetype(input.archetype)
  const level = input.level ?? 1
  const bodyMod = input.bodyMod ?? 0
  const characterId = createCompanionId()
  const record: CompanionRecord = {
    characterId,
    ownerCharacterId: input.ownerCharacterId,
    campaignId: input.campaignId,
    name: input.name.trim(),
    isCompanion: true,
    archetype: input.archetype
  }
  companionRecords.set(characterId, record)
  appendCompanionForOwner(input.ownerCharacterId, characterId)
  selectStartingLoadout(characterId, input.archetype, level)
  persistCharacterMaxHp({
    characterId,
    hitDie: archetype.hitDie,
    level,
    bodyMod
  })
  onboardingStatus.set(input.ownerCharacterId, 'completed')
  return copyCompanion(record)
}

export function listCompanions(ownerCharacterId: string): CompanionRecord[] {
  assertNonEmpty(ownerCharacterId, 'ownerCharacterId')
  const ids = companionsByOwner.get(ownerCharacterId) ?? []
  return ids.map((id) => copyCompanion(requireCompanion(id)))
}

export function getCompanion(characterId: string): CompanionRecord | undefined {
  const record = companionRecords.get(characterId)
  return record === undefined ? undefined : copyCompanion(record)
}

export function isCompanionCharacter(characterId: string): boolean {
  return companionRecords.has(characterId)
}

export function clearCompanionStore(): void {
  companionRecords.clear()
  companionsByOwner.clear()
  onboardingStatus.clear()
  nextCompanionId = 1
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
  const record = companionRecords.get(characterId)
  if (record === undefined) {
    throw new CharacterEngineError('COMPANION_NOT_FOUND', `Unknown companion: ${characterId}`)
  }
  return record
}

function appendCompanionForOwner(ownerCharacterId: string, characterId: string): void {
  const existing = companionsByOwner.get(ownerCharacterId) ?? []
  companionsByOwner.set(ownerCharacterId, [...existing, characterId])
}

function createCompanionId(): string {
  const id = `companion-${nextCompanionId}`
  nextCompanionId += 1
  return id
}

function copyCompanion(record: CompanionRecord): CompanionRecord {
  return { ...record }
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('COMPANION_INPUT_INVALID', `${label} must not be empty`)
  }
}
