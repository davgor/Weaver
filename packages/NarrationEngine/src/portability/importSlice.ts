import { restoreNarrationProjections } from '../proseStore.js'
import {
  NARRATION_SLICE_VERSION,
  NarrationPortabilitySchemaError,
  type NarrationCampaignSlice,
  type NarrationPortabilityContext
} from './types.js'

export function importCampaignSlice(
  ctx: NarrationPortabilityContext,
  slice: NarrationCampaignSlice
): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)
  restoreNarrationProjections({
    socialLines: slice.socialLines,
    sceneBlocks: slice.sceneBlocks
  })
}

function assertSliceVersion(slice: NarrationCampaignSlice): void {
  if (slice.sliceVersion !== NARRATION_SLICE_VERSION) {
    throw new NarrationPortabilitySchemaError(
      `Unsupported narration slice version ${String(slice.sliceVersion)}; expected ${NARRATION_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new NarrationPortabilitySchemaError(
      `Narration slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
