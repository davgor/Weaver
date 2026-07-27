import {
  LOCATION_KINDS as CHARACTER_LOCATION_KINDS,
  getCampaignDay
} from '@weaver/character-engine'
import { NpcEngineError } from './errors.js'
import { getNpcCampaignStore } from './store.js'

export const LOCATION_KINDS = CHARACTER_LOCATION_KINDS

export type LocationKind = (typeof LOCATION_KINDS)[number]

export type NpcLocation = {
  npcId: string
  campaignId: string
  regionId: string
  placeId?: string
  locationKind: LocationKind
  updatedDay?: number
}

export type SetNpcLocationInput = {
  npcId: string
  campaignId: string
  regionId: string
  placeId?: string
  locationKind: LocationKind
  /** When omitted, stamped from the campaign day counter. */
  updatedDay?: number
}

export function isLocationKind(value: unknown): value is LocationKind {
  return typeof value === 'string' && LOCATION_KINDS.some((kind) => kind === value)
}

export function validateNpcLocation(input: NpcLocation): NpcLocation {
  assertNonEmpty(input.npcId, 'npcId')
  assertNonEmpty(input.campaignId, 'campaignId')
  assertNonEmpty(input.regionId, 'regionId')
  if (input.placeId !== undefined) {
    assertNonEmpty(input.placeId, 'placeId')
  }
  if (!isLocationKind(input.locationKind)) {
    throw new NpcEngineError(
      'LOCATION_INPUT_INVALID',
      `locationKind must be one of: ${LOCATION_KINDS.join(', ')}`
    )
  }
  if (input.updatedDay !== undefined) {
    assertNonNegativeInteger(input.updatedDay, 'updatedDay')
  }
  return copyLocation(input)
}

export function setNpcLocation(input: SetNpcLocationInput): NpcLocation {
  const updatedDay = input.updatedDay ?? getCampaignDay(input.campaignId)
  const record = validateNpcLocation({
    npcId: input.npcId,
    campaignId: input.campaignId,
    regionId: input.regionId,
    locationKind: input.locationKind,
    updatedDay,
    ...(input.placeId === undefined ? {} : { placeId: input.placeId })
  })
  return getNpcCampaignStore().setLocation(record)
}

export function getNpcLocation(npcId: string): NpcLocation | null {
  const record = getNpcCampaignStore().getLocation(npcId)
  return record === undefined ? null : copyLocation(record)
}

export function clearNpcLocation(npcId: string): boolean {
  return getNpcCampaignStore().deleteLocation(npcId)
}

export function listNpcLocations(campaignId?: string): NpcLocation[] {
  return getNpcCampaignStore().listLocations(campaignId).map(copyLocation)
}

export function clearNpcLocationStore(): void {
  getNpcCampaignStore().clearLocations()
}

export function clearNpcLocationsForCampaign(campaignId: string): void {
  getNpcCampaignStore().clearLocationsForCampaign(campaignId)
}

export function restoreNpcLocations(records: readonly NpcLocation[]): void {
  for (const record of records) {
    getNpcCampaignStore().setLocation(validateNpcLocation(record))
  }
}

function copyLocation(record: NpcLocation): NpcLocation {
  return {
    npcId: record.npcId,
    campaignId: record.campaignId,
    regionId: record.regionId,
    locationKind: record.locationKind,
    ...(record.placeId === undefined ? {} : { placeId: record.placeId }),
    ...(record.updatedDay === undefined ? {} : { updatedDay: record.updatedDay })
  }
}

function assertNonEmpty(value: string, label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new NpcEngineError('LOCATION_INPUT_INVALID', `${label} must be a non-empty string`)
  }
}

function assertNonNegativeInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new NpcEngineError(
      'LOCATION_INPUT_INVALID',
      `${label} must be a non-negative integer`
    )
  }
}
