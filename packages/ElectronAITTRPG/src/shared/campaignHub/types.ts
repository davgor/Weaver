import type { ArchetypeId } from '@weaver/character-engine'
import type { BeginOnboardingRequest } from '../onboarding/types.js'

export type CampaignHubRegion = {
  regionId: string
  displayName: string
  summary: string
}

export type CampaignHubNpc = {
  npcId: string
  regionId: string
  displayName: string
  summary: string
}

export type CampaignWorldPreview = {
  campaignId: string
  campaignName: string
  premise: string
  summary: string
  regions: CampaignHubRegion[]
  npcs: CampaignHubNpc[]
}

export type CampaignHubCompanion = {
  characterId: string
  name: string
  archetype: ArchetypeId
}

export type CampaignHubRecap = {
  paragraphs: string[]
  eventIds: string[]
}

export type CampaignHubCharacter = {
  characterId: string
  characterName: string
  companions: CampaignHubCompanion[]
  recap: CampaignHubRecap
}

export type CampaignHubSnapshot = {
  campaignId: string
  worldPreview: CampaignWorldPreview
  characters: CampaignHubCharacter[]
}

export type CampaignHubApi = {
  load: (campaignId: string) => Promise<CampaignHubSnapshot>
  addCharacter: (campaignId: string) => Promise<BeginOnboardingRequest>
}
