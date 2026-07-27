import { existsSync } from 'node:fs'
import {
  createCampaign,
  createDefaultCampaignImportDeps,
  exportCampaignPackage,
  getActiveCampaignSession,
  importCampaignPackage,
  openCampaignSession,
  type CampaignImportDeps,
  type CampaignPortablePackage
} from '@weaver/dm-engine'
import type {
  DeleteCampaignRequest,
  DeleteCampaignResult,
  ExportCampaignRequest,
  ImportCampaignRequest,
  ImportCampaignResult
} from '../../shared/campaigns/types.js'
import {
  campaignExistsOnDisk,
  deleteCampaignDirectory,
  ensureCampaignLayout,
  listCampaignSummariesOnDisk,
  resolveCampaignDataRoot,
  resolveCampaignFilePath
} from './campaignDisk.js'

export type CampaignPortabilityPort = {
  exportCampaign: (request: ExportCampaignRequest) => Promise<CampaignPortablePackage>
  importCampaign: (request: ImportCampaignRequest) => Promise<ImportCampaignResult>
  deleteCampaign: (request: DeleteCampaignRequest) => Promise<DeleteCampaignResult>
  listDiskCampaigns: () => Promise<ReturnType<typeof listCampaignSummariesOnDisk>>
  campaignExistsOnDisk: (campaignId: string) => boolean
}

export function createLiveCampaignPortabilityPort(campaignsRoot: string): CampaignPortabilityPort {
  return {
    exportCampaign: async (request) => invokeExportCampaignPackage(campaignsRoot, request.campaignId),
    importCampaign: async (request) => invokeImportCampaignPackage(campaignsRoot, request.package),
    deleteCampaign: async (request) => deleteCampaignFromDisk(campaignsRoot, request),
    listDiskCampaigns: async () => listCampaignSummariesOnDisk(campaignsRoot),
    campaignExistsOnDisk: (campaignId) => campaignExistsOnDisk(campaignsRoot, campaignId)
  }
}

export function invokeExportCampaignPackage(
  campaignsRoot: string,
  campaignId: string,
  deps: CampaignImportDeps = createDefaultCampaignImportDeps()
): CampaignPortablePackage {
  if (!campaignExistsOnDisk(campaignsRoot, campaignId)) {
    throw new Error(`Campaign not found on disk: ${campaignId}`)
  }
  const campaignFilePath = resolveCampaignFilePath(campaignsRoot, campaignId)
  ensureCampaignDatabase(campaignId, campaignFilePath)
  ensureOpenCampaignSession(campaignId, campaignFilePath)
  const dataRoot = resolveCampaignDataRoot(campaignsRoot, campaignId)
  return exportCampaignPackage(deps, { dataRoot, campaignId })
}

export function invokeImportCampaignPackage(
  campaignsRoot: string,
  pkg: CampaignPortablePackage,
  deps: CampaignImportDeps = createDefaultCampaignImportDeps()
): ImportCampaignResult {
  ensureCampaignLayout(campaignsRoot, pkg.campaignId)
  const dataRoot = resolveCampaignDataRoot(campaignsRoot, pkg.campaignId)
  ensureCampaignDatabase(pkg.campaignId, resolveCampaignFilePath(campaignsRoot, pkg.campaignId))
  ensureOpenCampaignSession(pkg.campaignId, resolveCampaignFilePath(campaignsRoot, pkg.campaignId))
  importCampaignPackage(deps, { dataRoot, package: pkg })
  return { campaignId: pkg.campaignId, name: pkg.campaignId }
}

function deleteCampaignFromDisk(
  campaignsRoot: string,
  request: DeleteCampaignRequest
): Promise<DeleteCampaignResult> {
  deleteCampaignDirectory(campaignsRoot, request.campaignId)
  return Promise.resolve({ deleted: true })
}

function ensureCampaignDatabase(campaignId: string, campaignFilePath: string): void {
  if (existsSync(campaignFilePath)) return
  createCampaign({ campaignId, filePath: campaignFilePath }).close()
}

function ensureOpenCampaignSession(campaignId: string, campaignFilePath: string): void {
  const active = getActiveCampaignSession()
  if (active?.campaignId === campaignId) return
  active?.close()
  openCampaignSession({ campaignId, filePath: campaignFilePath })
}
