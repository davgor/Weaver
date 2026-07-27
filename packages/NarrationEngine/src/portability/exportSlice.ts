import { projectScene, projectSocial } from '../proseStore.js'
import {
  NARRATION_SLICE_VERSION,
  type NarrationCampaignSlice,
  type NarrationPortabilityContext
} from './types.js'

export function exportCampaignSlice(ctx: NarrationPortabilityContext): NarrationCampaignSlice {
  return {
    sliceVersion: NARRATION_SLICE_VERSION,
    campaignId: ctx.campaignId,
    socialLines: projectSocial(),
    sceneBlocks: projectScene()
  }
}
