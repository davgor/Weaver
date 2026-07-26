import { CharacterEngineError } from './errors.js'
import { getCampaignDay } from './timeRest.js'

export const LOCATION_KINDS = ['overworld', 'settlement', 'dungeon'] as const

export type LocationKind = (typeof LOCATION_KINDS)[number]

export type CharacterLocation = {
  characterId: string
  campaignId: string
  regionId: string
  placeId?: string
  locationKind: LocationKind
  updatedDay?: number
}

export type SetCharacterLocationInput = {
  characterId: string
  campaignId: string
  regionId: string
  placeId?: string
  locationKind: LocationKind
  /** When omitted, stamped from the campaign day counter. */
  updatedDay?: number
}

const locations = new Map<string, CharacterLocation>()

export function isLocationKind(value: unknown): value is LocationKind {
  return typeof value === 'string' && LOCATION_KINDS.some((kind) => kind === value)
}

export function validateCharacterLocation(input: CharacterLocation): CharacterLocation {
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.campaignId, 'campaignId')
  assertNonEmpty(input.regionId, 'regionId')
  if (input.placeId !== undefined) {
    assertNonEmpty(input.placeId, 'placeId')
  }
  if (!isLocationKind(input.locationKind)) {
    throw new CharacterEngineError(
      'LOCATION_INPUT_INVALID',
      `locationKind must be one of: ${LOCATION_KINDS.join(', ')}`
    )
  }
  if (input.updatedDay !== undefined) {
    assertNonNegativeInteger(input.updatedDay, 'updatedDay')
  }
  return copyLocation(input)
}

export function setCharacterLocation(input: SetCharacterLocationInput): CharacterLocation {
  const updatedDay = input.updatedDay ?? getCampaignDay(input.campaignId)
  const record = validateCharacterLocation({
    characterId: input.characterId,
    campaignId: input.campaignId,
    regionId: input.regionId,
    locationKind: input.locationKind,
    updatedDay,
    ...(input.placeId === undefined ? {} : { placeId: input.placeId })
  })
  locations.set(record.characterId, record)
  return copyLocation(record)
}

export function getCharacterLocation(characterId: string): CharacterLocation | null {
  const record = locations.get(characterId)
  return record === undefined ? null : copyLocation(record)
}

export function clearCharacterLocation(characterId: string): boolean {
  return locations.delete(characterId)
}

export function listCharacterLocations(campaignId?: string): CharacterLocation[] {
  const records = [...locations.values()].map(copyLocation)
  if (campaignId === undefined) {
    return records.sort(byCharacterId)
  }
  return records.filter((record) => record.campaignId === campaignId).sort(byCharacterId)
}

export function clearCharacterLocationStore(): void {
  locations.clear()
}

export function clearCharacterLocationsForCampaign(campaignId: string): void {
  for (const record of listCharacterLocations(campaignId)) {
    locations.delete(record.characterId)
  }
}

export function restoreCharacterLocations(records: readonly CharacterLocation[]): void {
  for (const record of records) {
    const validated = validateCharacterLocation(record)
    locations.set(validated.characterId, validated)
  }
}

function copyLocation(record: CharacterLocation): CharacterLocation {
  return {
    characterId: record.characterId,
    campaignId: record.campaignId,
    regionId: record.regionId,
    locationKind: record.locationKind,
    ...(record.placeId === undefined ? {} : { placeId: record.placeId }),
    ...(record.updatedDay === undefined ? {} : { updatedDay: record.updatedDay })
  }
}

function byCharacterId(left: CharacterLocation, right: CharacterLocation): number {
  return left.characterId.localeCompare(right.characterId)
}

function assertNonEmpty(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CharacterEngineError('LOCATION_INPUT_INVALID', `${label} must be a non-empty string`)
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new CharacterEngineError(
      'LOCATION_INPUT_INVALID',
      `${label} must be a non-negative integer`
    )
  }
}
