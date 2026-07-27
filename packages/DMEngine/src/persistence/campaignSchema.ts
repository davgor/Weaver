import type { Migration, SqliteDatabase } from './migrationRunner.js'

export const CURRENT_CAMPAIGN_SCHEMA_VERSION = 6

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
  },
  {
    version: 2,
    name: 'character_durable_facts',
    up(db) {
      createCharacterFactTables(db)
    }
  },
  {
    version: 3,
    name: 'item_durable_facts',
    up(db) {
      db.exec(`
        CREATE TABLE item_templates (
          id TEXT PRIMARY KEY,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE item_instances (
          id TEXT PRIMARY KEY,
          template_id TEXT NOT NULL,
          owner_character_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          UNIQUE (id),
          FOREIGN KEY (template_id) REFERENCES item_templates(id)
        );

        CREATE TABLE character_inventories (
          character_id TEXT PRIMARY KEY,
          held_json TEXT NOT NULL,
          equipped_json TEXT NOT NULL
        );

        CREATE TABLE character_currency (
          character_id TEXT PRIMARY KEY,
          balance INTEGER NOT NULL
        );

        CREATE TABLE place_inventories (
          place_id TEXT PRIMARY KEY,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE item_store_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
    }
  },
  {
    version: 4,
    name: 'npc_durable_facts',
    up(db) {
      createNpcFactTables(db)
    }
  },
  {
    version: 5,
    name: 'enemy_quest_narration_facts',
    up(db) {
      db.exec(`
        CREATE TABLE generated_foes (
          foe_id TEXT PRIMARY KEY,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE enemy_token_cache (
          cache_key TEXT PRIMARY KEY,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE quest_templates (
          template_id TEXT PRIMARY KEY,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE world_quests (
          quest_id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE narration_social_lines (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          character_id TEXT,
          channel TEXT,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE narration_scene_blocks (
          id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          character_id TEXT,
          channel TEXT,
          payload_json TEXT NOT NULL
        );

        CREATE TABLE narration_store_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `)
    }
  },
  {
    version: 6,
    name: 'onboarding_and_hub_state',
    up(db) {
      db.exec(`
        CREATE TABLE onboarding_records (
          character_id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          character_name TEXT NOT NULL,
          phase TEXT NOT NULL,
          selections_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE guided_creation_states (
          character_id TEXT PRIMARY KEY,
          campaign_id TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)
    }
  }
]

function createCharacterFactTables(db: SqliteDatabase): void {
  createCharacterCoreTables(db)
  createCharacterRecordTables(db)
  createCharacterLocationTables(db)
  createCharacterCompanionTables(db)
}

function createCharacterCoreTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE characters (
      id TEXT PRIMARY KEY,
      display_name TEXT,
      stats_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE character_store_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

function createCharacterRecordTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE character_journal_entries (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      linked_npc_id TEXT,
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE character_log_entries (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE character_quest_log (
      character_id TEXT NOT NULL,
      quest_id TEXT NOT NULL,
      kind TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT,
      PRIMARY KEY (character_id, quest_id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );

    CREATE TABLE character_known_actions (
      character_id TEXT NOT NULL,
      action_id TEXT NOT NULL,
      PRIMARY KEY (character_id, action_id),
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );
  `)
}

function createCharacterLocationTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE character_locations (
      character_id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      region_id TEXT NOT NULL,
      place_id TEXT,
      location_kind TEXT NOT NULL,
      updated_day INTEGER,
      FOREIGN KEY (character_id) REFERENCES characters(id)
    );
  `)
}

function createCharacterCompanionTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE companions (
      character_id TEXT PRIMARY KEY,
      owner_character_id TEXT NOT NULL,
      campaign_id TEXT NOT NULL,
      name TEXT NOT NULL,
      archetype TEXT NOT NULL,
      onboarding_owner_status TEXT
    );
  `)
}

function createNpcFactTables(db: SqliteDatabase): void {
  createNpcCoreTables(db)
  createNpcFactionTables(db)
  createNpcOpinionTables(db)
  createNpcLocationTables(db)
}

function createNpcCoreTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE npcs (
      npc_id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE npc_memories (
      memory_id TEXT PRIMARY KEY,
      npc_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      FOREIGN KEY (npc_id) REFERENCES npcs(npc_id)
    );

    CREATE TABLE world_facts (
      fact_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );
  `)
}

function createNpcFactionTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE factions (
      faction_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );

    CREATE TABLE faction_relations (
      source_faction_id TEXT NOT NULL,
      target_faction_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (source_faction_id, target_faction_id)
    );

    CREATE TABLE character_faction_reputations (
      character_id TEXT NOT NULL,
      faction_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (character_id, faction_id)
    );
  `)
}

function createNpcOpinionTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE npc_opinions (
      holder_npc_id TEXT NOT NULL,
      about_id TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY (holder_npc_id, about_id)
    );

    CREATE TABLE dm_npc_opinions (
      npc_id TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL
    );
  `)
}

function createNpcLocationTables(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE npc_locations (
      npc_id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      region_id TEXT NOT NULL,
      place_id TEXT,
      location_kind TEXT NOT NULL,
      updated_day INTEGER
    );
  `)
}
