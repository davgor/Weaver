import { createWorldService } from '../store/worldService.js'
import {
  WORLD_SLICE_VERSION,
  WorldPortabilitySchemaError,
  type WorldCampaignSlice,
  type WorldPortabilityContext
} from './types.js'

export function importCampaignSlice(ctx: WorldPortabilityContext, slice: WorldCampaignSlice): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  assertWorldMatch(ctx.worldId, slice.worldId)

  const service = createWorldService(ctx.dataRoot)
  if (service.hasWorld(slice.worldId)) {
    service.deleteWorld(slice.worldId)
  }
  service.createWorld({
    worldId: slice.worldId,
    seed: slice.meta.seed,
    bounds: slice.meta.bounds
  })
}

function assertSliceVersion(slice: WorldCampaignSlice): void {
  if (slice.sliceVersion !== WORLD_SLICE_VERSION) {
    throw new WorldPortabilitySchemaError(
      `Unsupported world slice version ${String(slice.sliceVersion)}; expected ${WORLD_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new WorldPortabilitySchemaError(
      `World slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}

function assertWorldMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new WorldPortabilitySchemaError(
      `World slice worldId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
