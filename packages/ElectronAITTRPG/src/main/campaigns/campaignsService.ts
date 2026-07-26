import type { CampaignReviewSnapshot } from '../../shared/campaignCreate/types.js'
import type {
  CampaignCharacterLandingRecord,
  CampaignsApi,
  CampaignSummary,
  DeleteCampaignRequest,
  DeleteCampaignResult,
  ExportCampaignRequest,
  ImportCampaignRequest,
  ImportCampaignResult,
  OpenCampaignRequest,
  OpenCampaignResult
} from '../../shared/campaigns/types.js'
import type { CampaignPortablePackage } from '@weaver/dm-engine'
import { shouldLandOnHub } from './landingPolicy.js'

export type CampaignsCoreDeps = {
  getReview: () => Promise<CampaignReviewSnapshot | null>
  listCharacters: (campaignId: string) => CampaignCharacterLandingRecord[]
}

export type CampaignsPortabilityDeps = {
  listDiskCampaigns: () => Promise<CampaignSummary[]>
  campaignExistsOnDisk: (campaignId: string) => boolean
  exportCampaign: (request: ExportCampaignRequest) => Promise<CampaignPortablePackage>
  importCampaign: (request: ImportCampaignRequest) => Promise<ImportCampaignResult>
  deleteCampaign: (request: DeleteCampaignRequest) => Promise<DeleteCampaignResult>
}

export type CampaignsServiceDeps = CampaignsCoreDeps & Partial<CampaignsPortabilityDeps>

export type CampaignsService = CampaignsApi

export function createCampaignsService(deps: CampaignsServiceDeps): CampaignsService {
  const resolved = resolveCampaignsServiceDeps(deps)
  return {
    list: () => listCampaigns(resolved),
    open: (request) => openCampaign(resolved, request),
    export: (request) => resolved.exportCampaign(request),
    import: (request) => resolved.importCampaign(request),
    delete: (request) => resolved.deleteCampaign(request)
  }
}

function resolveCampaignsServiceDeps(deps: CampaignsServiceDeps): CampaignsCoreDeps & CampaignsPortabilityDeps {
  return {
    getReview: deps.getReview,
    listCharacters: deps.listCharacters,
    listDiskCampaigns: deps.listDiskCampaigns ?? (async () => []),
    campaignExistsOnDisk: deps.campaignExistsOnDisk ?? (() => true),
    exportCampaign:
      deps.exportCampaign ??
      (async () => {
        throw new Error('Campaign export is not configured')
      }),
    importCampaign:
      deps.importCampaign ??
      (async () => {
        throw new Error('Campaign import is not configured')
      }),
    deleteCampaign:
      deps.deleteCampaign ??
      (async () => {
        throw new Error('Campaign delete is not configured')
      })
  }
}

async function listCampaigns(
  deps: CampaignsCoreDeps & CampaignsPortabilityDeps
): Promise<CampaignSummary[]> {
  const [diskCampaigns, review] = await Promise.all([deps.listDiskCampaigns(), deps.getReview()])
  const merged = new Map(diskCampaigns.map((campaign) => [campaign.id, campaign]))
  const reviewSummary = reviewSnapshotSummary(review)
  if (reviewSummary !== null && deps.campaignExistsOnDisk(reviewSummary.id)) {
    merged.set(reviewSummary.id, reviewSummary)
  }
  return [...merged.values()].sort((left, right) => left.name.localeCompare(right.name))
}

function reviewSnapshotSummary(review: CampaignReviewSnapshot | null): CampaignSummary | null {
  if (review === null) return null
  return { id: review.campaignId, name: review.campaignName, lastPlayedAt: null }
}

async function openCampaign(
  deps: CampaignsCoreDeps,
  request: OpenCampaignRequest
): Promise<OpenCampaignResult> {
  const characters = deps.listCharacters(request.campaignId)
  return {
    campaignId: request.campaignId,
    landing: shouldLandOnHub(characters) ? 'hub' : 'empty'
  }
}
