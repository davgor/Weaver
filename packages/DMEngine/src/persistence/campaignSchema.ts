import type { Migration } from './migrationRunner.js'

export const CURRENT_CAMPAIGN_SCHEMA_VERSION = 1

export const campaignMigrations: readonly Migration[] = [
  {
    version: 1,
    name: 'campaign_bundle_stubs',
    up(db) {
      db.exec(`
        CREATE TABLE campaign_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE campaign_characters (
          id TEXT PRIMARY KEY,
          display_name TEXT,
          engine_ref TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE campaign_npcs (
          id TEXT PRIMARY KEY,
          display_name TEXT,
          engine_ref TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE campaign_quests (
          id TEXT PRIMARY KEY,
          title TEXT,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE campaign_catalog_entries (
          catalog TEXT NOT NULL,
          id TEXT NOT NULL,
          version INTEGER NOT NULL,
          payload_json TEXT NOT NULL,
          seeded_at TEXT NOT NULL,
          PRIMARY KEY (catalog, id)
        );
      `)
    }
  }
]
