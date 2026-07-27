import type { SceneBlock, SocialLine } from '../proseTypes.js'

export const NARRATION_SLICE_VERSION = 1

export type NarrationPortabilityContext = {
  campaignId: string
}

export type NarrationCampaignSlice = {
  sliceVersion: typeof NARRATION_SLICE_VERSION
  campaignId: string
  socialLines: SocialLine[]
  sceneBlocks: SceneBlock[]
}

export class NarrationPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NarrationPortabilitySchemaError'
  }
}
