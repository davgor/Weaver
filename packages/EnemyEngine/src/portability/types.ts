import type { GeneratedFoeRef } from '../types.js'

export const ENEMY_SLICE_VERSION = 1

export type EnemyPortabilityContext = {
  campaignId: string
}

export type EnemyCampaignSlice = {
  sliceVersion: typeof ENEMY_SLICE_VERSION
  campaignId: string
  bestiaryIds: string[]
  generatedFoes: GeneratedFoeRef[]
}

export class EnemyPortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnemyPortabilitySchemaError'
  }
}
