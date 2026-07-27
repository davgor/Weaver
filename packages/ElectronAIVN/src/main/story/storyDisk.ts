import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import {
  openCampaign,
  readCampaignMeta,
  readCatalogEntry,
  type VnStoryOverview
} from '@weaver/dm-engine'
import type { VnSavedGameSummary } from '../../shared/story/types.js'

export function resolveStoryPaths(
  storiesRoot: string,
  campaignId: string
): { dataRoot: string; campaignFilePath: string } {
  const root = join(storiesRoot, campaignId)
  return {
    dataRoot: join(root, 'data'),
    campaignFilePath: join(root, 'story.sqlite')
  }
}

export function ensureStoryLayout(storiesRoot: string, campaignId: string): void {
  mkdirSync(join(storiesRoot, campaignId, 'data'), { recursive: true })
}

export function listPermanentVnStories(storiesRoot: string): VnSavedGameSummary[] {
  if (!existsSync(storiesRoot)) return []
  return readdirSync(storiesRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .flatMap((campaignId) => readPermanentSummary(storiesRoot, campaignId))
    .sort((left, right) => left.campaignId.localeCompare(right.campaignId))
}

function readPermanentSummary(
  storiesRoot: string,
  campaignId: string
): VnSavedGameSummary[] {
  const { campaignFilePath } = resolveStoryPaths(storiesRoot, campaignId)
  if (!existsSync(campaignFilePath)) return []
  const handle = openCampaign({ campaignId, filePath: campaignFilePath })
  try {
    return summarizePermanentHandle(handle, campaignId)
  } finally {
    handle.close()
  }
}

function summarizePermanentHandle(
  handle: Parameters<typeof readCampaignMeta>[0],
  campaignId: string
): VnSavedGameSummary[] {
  if (readCampaignMeta(handle, 'kind') !== 'vn_story') return []
  if (readCampaignMeta(handle, 'lifecycle') !== 'permanent') return []
  const overview = parseOverview(readCatalogEntry(handle, 'vn_story', 'overview')?.payloadJson)
  const actCount = Number.parseInt(readCampaignMeta(handle, 'act_count') ?? '3', 10)
  return [
    {
      campaignId,
      title: overview?.mainCharacter.name ?? campaignId,
      premiseSummary: overview?.premiseSummary ?? '',
      actCount: Number.isFinite(actCount) ? actCount : 3,
      lifecycle: 'permanent'
    }
  ]
}

function parseOverview(payloadJson: string | undefined): VnStoryOverview | null {
  if (payloadJson === undefined) return null
  try {
    const parsed: unknown = JSON.parse(payloadJson)
    if (!isOverview(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

function isOverview(value: unknown): value is VnStoryOverview {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.premiseSummary === 'string' && typeof row.mainCharacter === 'object'
}
