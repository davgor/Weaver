import type { CharacterCampaignSlice } from '@weaver/character-engine'
import type { CivilizationCampaignSlice } from '@weaver/civilization-engine'
import type { EnemyCampaignSlice } from '@weaver/enemy-engine'
import type { ItemCampaignSlice } from '@weaver/item-engine'
import type { NarrationCampaignSlice } from '@weaver/narration-engine'
import type { NpcCampaignSlice } from '@weaver/npc-engine'
import type { QuestCampaignSlice } from '@weaver/quest-engine'
import type { RegionalCampaignSlice } from '@weaver/regional-engine'
import type { WorldCampaignSlice } from '@weaver/world-engine'
import type { OnboardingCampaignSlice } from '../persistence/repositories/sqliteOnboardingStore.js'

export type CampaignPortablePackage = {
  version: number
  campaignId: string
  exportedAt: string
  slices: {
    world: WorldCampaignSlice
    regional: RegionalCampaignSlice
    civilization: CivilizationCampaignSlice
    npc: NpcCampaignSlice
    enemy: EnemyCampaignSlice
    character: CharacterCampaignSlice
    item: ItemCampaignSlice
    quest: QuestCampaignSlice
    narration: NarrationCampaignSlice
    /** Includes in-progress onboarding, guided transcripts, and opening-scene flags. */
    onboarding: OnboardingCampaignSlice
  }
}

/** Pre-onboarding/narration portable packages (package schema version 2). */
export type CampaignPortablePackageV2 = {
  version: 2
  campaignId: string
  exportedAt: string
  slices: Omit<CampaignPortablePackage['slices'], 'onboarding' | 'narration'>
}

/** Pre-quest portable packages (package schema version 1). */
export type CampaignPortablePackageV1 = {
  version: 1
  campaignId: string
  exportedAt: string
  slices: Omit<CampaignPortablePackage['slices'], 'quest' | 'onboarding' | 'narration'>
}

export type CampaignPortablePackageInput =
  | CampaignPortablePackage
  | CampaignPortablePackageV2
  | CampaignPortablePackageV1

export type CampaignPortabilityContext = {
  dataRoot: string
  campaignId: string
  worldId: string
}

export class PortabilitySchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PortabilitySchemaError'
  }
}
