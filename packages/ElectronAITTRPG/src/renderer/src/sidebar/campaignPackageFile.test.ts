import { describe, expect, it } from 'vitest'
import type { CampaignPortablePackage } from '@weaver/dm-engine'
import {
  buildCampaignExportFilename,
  parseCampaignPackageFile
} from './campaignPackageFile.js'

describe('campaignPackageFile', () => {
  it('parses a portable package JSON file and builds a stable export filename', async () => {
    const pkg = {
      version: 1,
      campaignId: 'ash-road',
      exportedAt: '2026-07-26T12:00:00.000Z',
      slices: {}
    } as CampaignPortablePackage

    const file = new File([JSON.stringify(pkg)], 'backup.json', { type: 'application/json' })
    expect(await parseCampaignPackageFile(file)).toEqual(pkg)
    expect(buildCampaignExportFilename('ash-road')).toBe('ash-road.weaver-campaign.json')
  })

  it('rejects invalid portable package JSON', async () => {
    const file = new File(['{"version":1}'], 'broken.json', { type: 'application/json' })
    await expect(parseCampaignPackageFile(file)).rejects.toThrow(/campaignId/)
  })
})
