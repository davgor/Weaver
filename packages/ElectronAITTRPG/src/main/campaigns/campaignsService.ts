import type { CampaignReviewSnapshot } from '../../shared/campaignCreate/types.js'
import type {
  CampaignCharacterLandingRecord,
  CampaignsApi,
  CampaignSummary,
  OpenCampaignRequest,
  OpenCampaignResult
} from '../../shared/campaigns/types.js'
import { shouldLandOnHub } from './landingPolicy.js'

export type CampaignsServiceDeps = {
  getReview: () => Promise<CampaignReviewSnapshot | null>
  listCharacters: (campaignId: string) => CampaignCharacterLandingRecord[]
}

export type CampaignsService = CampaignsApi

export function createCampaignsService(deps: CampaignsServiceDeps): CampaignsService {
  return {
    list: () => listCampaigns(deps),
    open: (request) => openCampaign(deps, request)
  }
}

async function listCampaigns(deps: CampaignsServiceDeps): Promise<CampaignSummary[]> {
  const review = await deps.getReview()
  if (review === null) return []
  return [{ id: review.campaignId, name: review.campaignName, lastPlayedAt: null }]
}

async function openCampaign(
  deps: CampaignsServiceDeps,
  request: OpenCampaignRequest
): Promise<OpenCampaignResult> {
  const characters = deps.listCharacters(request.campaignId)
  return {
    campaignId: request.campaignId,
    landing: shouldLandOnHub(characters) ? 'hub' : 'empty'
  }
}
