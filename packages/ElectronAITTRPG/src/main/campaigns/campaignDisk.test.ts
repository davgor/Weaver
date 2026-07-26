import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  campaignExistsOnDisk,
  deleteCampaignDirectory,
  listCampaignSummariesOnDisk,
  resolveCampaignDirectory
} from './campaignDisk.js'

const roots: string[] = []

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('campaignDisk', () => {
  it('lists campaign directories that contain a data folder', () => {
    const campaignsRoot = tempRoot()
    seedCampaignLayout(campaignsRoot, 'alpha')
    seedCampaignLayout(campaignsRoot, 'beta')
    mkdirSync(join(campaignsRoot, 'notes'), { recursive: true })

    expect(listCampaignSummariesOnDisk(campaignsRoot)).toEqual([
      { id: 'alpha', name: 'alpha', lastPlayedAt: null },
      { id: 'beta', name: 'beta', lastPlayedAt: null }
    ])
  })

  it('detects campaign directories and deletes them recursively', () => {
    const campaignsRoot = tempRoot()
    seedCampaignLayout(campaignsRoot, 'remove-me')
    const campaignDir = resolveCampaignDirectory(campaignsRoot, 'remove-me')

    expect(campaignExistsOnDisk(campaignsRoot, 'remove-me')).toBe(true)
    deleteCampaignDirectory(campaignsRoot, 'remove-me')
    expect(existsSync(campaignDir)).toBe(false)
    expect(campaignExistsOnDisk(campaignsRoot, 'remove-me')).toBe(false)
  })
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'electron-campaign-disk-'))
  roots.push(root)
  return root
}

function seedCampaignLayout(campaignsRoot: string, campaignId: string): void {
  const dataRoot = join(campaignsRoot, campaignId, 'data')
  mkdirSync(dataRoot, { recursive: true })
  writeFileSync(join(campaignsRoot, campaignId, 'campaign.sqlite'), '')
}
