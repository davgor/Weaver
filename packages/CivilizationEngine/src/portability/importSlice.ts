import { createCivilizationStore } from '../store/civilizationStore.js'
import {
  CIVILIZATION_SLICE_VERSION,
  CivilizationPortabilitySchemaError,
  type CivilizationCampaignSlice,
  type CivilizationPortabilityContext
} from './types.js'

export function importCampaignSlice(
  ctx: CivilizationPortabilityContext,
  slice: CivilizationCampaignSlice
): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  assertWorldMatch(ctx.worldId, slice.worldId)

  const store = createCivilizationStore(ctx.dataRoot)
  store.clearCivilizations(ctx.worldId)
  for (const entry of slice.civilizations) {
    store.saveCivilization(entry.record, entry.claimedCells)
  }
  if (slice.slots.length > 0) {
    store.saveSlots(slice.slots)
  }
}

function assertSliceVersion(slice: CivilizationCampaignSlice): void {
  if (slice.sliceVersion !== CIVILIZATION_SLICE_VERSION) {
    throw new CivilizationPortabilitySchemaError(
      `Unsupported civilization slice version ${String(slice.sliceVersion)}; expected ${CIVILIZATION_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new CivilizationPortabilitySchemaError(
      `Civilization slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}

function assertWorldMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new CivilizationPortabilitySchemaError(
      `Civilization slice worldId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
