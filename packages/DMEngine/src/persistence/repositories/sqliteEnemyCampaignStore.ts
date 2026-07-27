import {
  createMemoryEnemyCampaignStore,
  type EnemyCampaignStore,
  type EnemyCombatToken,
  type GeneratedFoeRef
} from '@weaver/enemy-engine'
import type { SqliteDatabase } from '../migrationRunner.js'

type FoeRow = { foe_id: string; payload_json: string }
type TokenRow = { cache_key: string; payload_json: string }

export function createSqliteEnemyCampaignStore(db: SqliteDatabase): EnemyCampaignStore {
  const memory = createMemoryEnemyCampaignStore()
  hydrateFoes(db, memory)
  hydrateTokenCache(db, memory)
  return wrapWriteThrough(db, memory)
}

function hydrateFoes(db: SqliteDatabase, memory: EnemyCampaignStore): void {
  const rows = db
    .prepare('SELECT foe_id, payload_json FROM generated_foes ORDER BY foe_id')
    .all() as FoeRow[]
  for (const row of rows) {
    memory.saveGeneratedFoe(JSON.parse(row.payload_json) as GeneratedFoeRef)
  }
}

function hydrateTokenCache(db: SqliteDatabase, memory: EnemyCampaignStore): void {
  const rows = db
    .prepare('SELECT cache_key, payload_json FROM enemy_token_cache ORDER BY cache_key')
    .all() as TokenRow[]
  for (const row of rows) {
    memory.setCachedCombatToken(row.cache_key, JSON.parse(row.payload_json) as EnemyCombatToken)
  }
}

function wrapWriteThrough(db: SqliteDatabase, memory: EnemyCampaignStore): EnemyCampaignStore {
  return {
    saveGeneratedFoe: (foe) => {
      const saved = memory.saveGeneratedFoe(foe)
      persistFoe(db, saved)
      return saved
    },
    getGeneratedFoe: (foeId) => memory.getGeneratedFoe(foeId),
    updateGeneratedFoeToken: (foeId, token) => {
      memory.updateGeneratedFoeToken(foeId, token)
      const foe = memory.getGeneratedFoe(foeId)
      if (foe !== undefined) {
        persistFoe(db, foe)
      }
    },
    getCachedCombatToken: (cacheKey) => memory.getCachedCombatToken(cacheKey),
    setCachedCombatToken: (cacheKey, token) => {
      memory.setCachedCombatToken(cacheKey, token)
      persistToken(db, cacheKey, token)
    },
    clearEnemyStore: () => {
      memory.clearEnemyStore()
      db.prepare('DELETE FROM generated_foes').run()
      db.prepare('DELETE FROM enemy_token_cache').run()
    },
    listGeneratedFoes: () => memory.listGeneratedFoes()
  }
}

function persistFoe(db: SqliteDatabase, foe: GeneratedFoeRef): void {
  db.prepare(
    `INSERT INTO generated_foes (foe_id, payload_json)
     VALUES (?, ?)
     ON CONFLICT(foe_id) DO UPDATE SET payload_json = excluded.payload_json`
  ).run(foe.foeId, JSON.stringify(foe))
}

function persistToken(db: SqliteDatabase, cacheKey: string, token: EnemyCombatToken): void {
  db.prepare(
    `INSERT INTO enemy_token_cache (cache_key, payload_json)
     VALUES (?, ?)
     ON CONFLICT(cache_key) DO UPDATE SET payload_json = excluded.payload_json`
  ).run(cacheKey, JSON.stringify(token))
}
