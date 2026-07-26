import { clearEnemyStore, saveGeneratedFoe } from '../store.js'
import {
  ENEMY_SLICE_VERSION,
  EnemyPortabilitySchemaError,
  type EnemyCampaignSlice,
  type EnemyPortabilityContext
} from './types.js'

export function importCampaignSlice(ctx: EnemyPortabilityContext, slice: EnemyCampaignSlice): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)

  clearEnemyStore()
  for (const foe of slice.generatedFoes) {
    saveGeneratedFoe(foe)
  }
}

function assertSliceVersion(slice: EnemyCampaignSlice): void {
  if (slice.sliceVersion !== ENEMY_SLICE_VERSION) {
    throw new EnemyPortabilitySchemaError(
      `Unsupported enemy slice version ${String(slice.sliceVersion)}; expected ${ENEMY_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new EnemyPortabilitySchemaError(
      `Enemy slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
