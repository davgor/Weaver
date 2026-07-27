import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createCampaign, openCampaign } from './campaignPersistence.js'
import {
  readCampaignMeta,
  readCatalogEntry,
  upsertCampaignMeta
} from './campaignMeta.js'

describe('campaign meta helpers', () => {
  it('upserts and reads campaign meta keys', () => {
    withCampaignPath('meta.sqlite', (filePath) => {
      const created = createCampaign({ campaignId: 'meta-test', filePath })
      upsertCampaignMeta(created, 'lifecycle', 'draft')
      upsertCampaignMeta(created, 'kind', 'vn_story')
      created.close()

      const opened = openCampaign({ campaignId: 'meta-test', filePath })
      expect(readCampaignMeta(opened, 'lifecycle')).toBe('draft')
      expect(readCampaignMeta(opened, 'kind')).toBe('vn_story')
      expect(readCampaignMeta(opened, 'missing')).toBeUndefined()
      opened.close()
    })
  })

  it('reads catalog entries seeded at create time', () => {
    withCampaignPath('catalog-meta.sqlite', (filePath) => {
      createCampaign({
        campaignId: 'catalog-meta',
        filePath,
        seedCatalog: ({ catalog }) => {
          catalog.upsert({
            catalog: 'vn_story',
            id: 'brief',
            version: 1,
            payloadJson: '{"premise":"x"}'
          })
        }
      }).close()

      const opened = openCampaign({ campaignId: 'catalog-meta', filePath })
      expect(readCatalogEntry(opened, 'vn_story', 'brief')).toEqual({
        catalog: 'vn_story',
        id: 'brief',
        version: 1,
        payloadJson: '{"premise":"x"}'
      })
      expect(readCatalogEntry(opened, 'vn_story', 'missing')).toBeUndefined()
      opened.close()
    })
  })
})

function withCampaignPath(filename: string, run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-engine-meta-'))
  try {
    run(join(root, filename))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
