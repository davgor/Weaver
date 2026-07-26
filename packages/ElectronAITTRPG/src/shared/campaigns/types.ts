import type { WizardPhase } from '../onboarding/types.js'

export type CampaignSummary = {
  id: string
  name: string
  lastPlayedAt: string | null
}

export type CampaignLanding = 'empty' | 'hub'

export type OpenCampaignRequest = {
  campaignId: string
}

export type OpenCampaignResult = {
  campaignId: string
  landing: CampaignLanding
}

export type CampaignCharacterLandingRecord = {
  characterId: string
  phase: WizardPhase
}

export type CampaignsApi = {
  list: () => Promise<CampaignSummary[]>
  open: (request: OpenCampaignRequest) => Promise<OpenCampaignResult>
}
