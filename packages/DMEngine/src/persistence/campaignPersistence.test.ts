import Database from 'better-sqlite3'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  UnknownCampaignSchemaVersionError,
  createCampaign,
  openCampaign,
  type CatalogSeedHook
} from './campaignPersistence.js'

describe('campaign persistence lifecycle', () => {
  it('creates one SQLite file per campaign and migrates schema stubs', () => {
    withCampaignPath('alpha.sqlite', (filePath) => {
      const created = createCampaign({ campaignId: 'alpha', filePath })
      created.close()

      expect(existsSync(filePath)).toBe(true)
      expect(created).toMatchObject({
        campaignId: 'alpha',
        filePath,
        schemaVersion: CURRENT_CAMPAIGN_SCHEMA_VERSION,
        appliedMigrations: [1]
      })
      expect(readTableNames(filePath)).toEqual([
        'campaign_catalog_entries',
        'campaign_characters',
        'campaign_meta',
        'campaign_npcs',
        'campaign_quests',
        'schema_migrations'
      ])
    })
  })

  it('re-opens an up-to-date campaign as a no-op', () => {
    withCampaignPath('reopen.sqlite', (filePath) => {
      createCampaign({ campaignId: 'reopen', filePath }).close()

      const opened = openCampaign({ campaignId: 'reopen', filePath })
      opened.close()

      expect(opened.schemaVersion).toBe(CURRENT_CAMPAIGN_SCHEMA_VERSION)
      expect(opened.appliedMigrations).toEqual([])
      expect(readMigrationVersions(filePath)).toEqual([1])
    })
  })
})

describe('campaign migration safeguards', () => {
  it('rejects a campaign database from a newer unknown schema version', () => {
    withCampaignPath('future.sqlite', (filePath) => {
      const db = new Database(filePath)
      db.exec(`
        CREATE TABLE schema_migrations (
          version INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          applied_at TEXT NOT NULL
        );
        INSERT INTO schema_migrations (version, name, applied_at)
        VALUES (${CURRENT_CAMPAIGN_SCHEMA_VERSION + 1}, 'future', '2026-07-26T00:00:00.000Z');
      `)
      db.close()

      expect(() => openCampaign({ campaignId: 'future', filePath })).toThrow(
        UnknownCampaignSchemaVersionError
      )
    })
  })

  it('invokes a deterministic catalog seed hook during migration', () => {
    withCampaignPath('seeded.sqlite', (filePath) => {
      const seedCatalog: CatalogSeedHook = ({ catalog }) => {
        catalog.upsert({
          catalog: 'creatures',
          id: 'seed-rat',
          version: 1,
          payloadJson: '{"hp":1,"name":"Rat"}'
        })
      }

      createCampaign({ campaignId: 'seeded', filePath, seedCatalog }).close()

      expect(readCatalogRows(filePath)).toEqual([
        { catalog: 'creatures', id: 'seed-rat', version: 1, payload_json: '{"hp":1,"name":"Rat"}' }
      ])
    })
  })
})

function withCampaignPath(filename: string, run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-engine-campaign-'))
  try {
    run(join(root, filename))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}

function readTableNames(filePath: string): string[] {
  const db = new Database(filePath, { readonly: true })
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all() as Array<{ name: string }>
  db.close()
  return rows.map((row) => row.name)
}

function readMigrationVersions(filePath: string): number[] {
  const db = new Database(filePath, { readonly: true })
  const rows = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all() as Array<{ version: number }>
  db.close()
  return rows.map((row) => row.version)
}

function readCatalogRows(filePath: string): Array<{
  catalog: string
  id: string
  version: number
  payload_json: string
}> {
  const db = new Database(filePath, { readonly: true })
  const rows = db
    .prepare('SELECT catalog, id, version, payload_json FROM campaign_catalog_entries ORDER BY id')
    .all() as Array<{ catalog: string; id: string; version: number; payload_json: string }>
  db.close()
  return rows
}
