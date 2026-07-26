import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { CampaignSummary } from '../../shared/campaigns/types.js'

export function resolveCampaignDirectory(campaignsRoot: string, campaignId: string): string {
  return join(campaignsRoot, campaignId)
}

export function resolveCampaignDataRoot(campaignsRoot: string, campaignId: string): string {
  return join(resolveCampaignDirectory(campaignsRoot, campaignId), 'data')
}

export function resolveCampaignFilePath(campaignsRoot: string, campaignId: string): string {
  return join(resolveCampaignDirectory(campaignsRoot, campaignId), 'campaign.sqlite')
}

export function campaignExistsOnDisk(campaignsRoot: string, campaignId: string): boolean {
  return existsSync(resolveCampaignDataRoot(campaignsRoot, campaignId))
}

export function listCampaignSummariesOnDisk(campaignsRoot: string): CampaignSummary[] {
  if (!existsSync(campaignsRoot)) return []
  return readdirSync(campaignsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((campaignId) => campaignExistsOnDisk(campaignsRoot, campaignId))
    .sort((left, right) => left.localeCompare(right))
    .map((campaignId) => ({
      id: campaignId,
      name: campaignId,
      lastPlayedAt: null
    }))
}

export function ensureCampaignLayout(campaignsRoot: string, campaignId: string): void {
  mkdirSync(resolveCampaignDataRoot(campaignsRoot, campaignId), { recursive: true })
}

export function deleteCampaignDirectory(campaignsRoot: string, campaignId: string): void {
  const campaignDir = resolveCampaignDirectory(campaignsRoot, campaignId)
  if (!existsSync(campaignDir)) return
  rmSync(campaignDir, { force: true, recursive: true })
}
