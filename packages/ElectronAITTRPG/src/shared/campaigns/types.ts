import type { WizardPhase } from '../onboarding/types.js'
import type { CampaignPortablePackage } from '@weaver/dm-engine'

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

export type ExportCampaignRequest = {
  campaignId: string
}

export type ImportCampaignRequest = {
  package: CampaignPortablePackage
}

export type ImportCampaignResult = {
  campaignId: string
  name: string
}

export type DeleteCampaignRequest = {
  campaignId: string
}

export type DeleteCampaignResult = {
  deleted: true
}

export type CampaignCharacterLandingRecord = {
  characterId: string
  phase: WizardPhase
}

export type CampaignsApi = {
  list: () => Promise<CampaignSummary[]>
  open: (request: OpenCampaignRequest) => Promise<OpenCampaignResult>
  export: (request: ExportCampaignRequest) => Promise<CampaignPortablePackage>
  import: (request: ImportCampaignRequest) => Promise<ImportCampaignResult>
  delete: (request: DeleteCampaignRequest) => Promise<DeleteCampaignResult>
}

export type { CampaignPortablePackage } from '@weaver/dm-engine'
