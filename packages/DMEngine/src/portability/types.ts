import type { CharacterCampaignSlice } from '@weaver/character-engine'
import type { CivilizationCampaignSlice } from '@weaver/civilization-engine'
import type { EnemyCampaignSlice } from '@weaver/enemy-engine'
import type { ItemCampaignSlice } from '@weaver/item-engine'
import type { NpcCampaignSlice } from '@weaver/npc-engine'
import type { QuestCampaignSlice } from '@weaver/quest-engine'
import type { RegionalCampaignSlice } from '@weaver/regional-engine'
import type { WorldCampaignSlice } from '@weaver/world-engine'

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
  }
}

/** Pre-quest portable packages (package schema version 1). */
export type CampaignPortablePackageV1 = {
  version: 1
  campaignId: string
  exportedAt: string
  slices: Omit<CampaignPortablePackage['slices'], 'quest'>
}

export type CampaignPortablePackageInput =
  | CampaignPortablePackage
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
