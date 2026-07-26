import {
  clearCompanionsForCampaign,
  restoreCompanionsForCampaign
} from '../companions.js'
import { setCampaignDeathMode } from '../deathModes.js'
import {
  clearCharacterLocationsForCampaign,
  restoreCharacterLocations
} from '../location.js'
import { setCampaignDay } from '../timeRest.js'
import {
  CHARACTER_SLICE_VERSION,
  CharacterPortabilitySchemaError,
  type CharacterCampaignSlice,
  type CharacterPortabilityContext
} from './types.js'

export function importCampaignSlice(
  ctx: CharacterPortabilityContext,
  slice: CharacterCampaignSlice
): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  assertLocationCampaignIds(ctx.campaignId, slice.locations)

  clearCompanionsForCampaign(ctx.campaignId)
  clearCharacterLocationsForCampaign(ctx.campaignId)
  setCampaignDay(ctx.campaignId, slice.day)
  if (slice.deathMode !== undefined) {
    setCampaignDeathMode(ctx.campaignId, slice.deathMode)
  }
  restoreCompanionsForCampaign(slice.companions)
  restoreCharacterLocations(slice.locations)
}

function assertLocationCampaignIds(
  campaignId: string,
  locations: CharacterCampaignSlice['locations']
): void {
  for (const location of locations) {
    if (location.campaignId !== campaignId) {
      throw new CharacterPortabilitySchemaError(
        `Location ${location.characterId} belongs to campaign ${location.campaignId}, expected ${campaignId}`
      )
    }
  }
}

function assertSliceVersion(slice: CharacterCampaignSlice): void {
  if (slice.sliceVersion !== CHARACTER_SLICE_VERSION) {
    throw new CharacterPortabilitySchemaError(
      `Unsupported character slice version ${String(slice.sliceVersion)}; expected ${CHARACTER_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new CharacterPortabilitySchemaError(
      `Character slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
