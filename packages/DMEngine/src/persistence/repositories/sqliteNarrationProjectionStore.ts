import {
  createMemoryNarrationProjectionStore,
  type NarrationProjectionStore,
  type SceneBlock,
  type SocialLine
} from '@weaver/narration-engine'
import type { SqliteDatabase } from '../migrationRunner.js'

export type NarrationProjectionScope = {
  campaignId: string
  characterId?: string
  channel?: string
}

type SocialRow = { id: string; payload_json: string }
type SceneRow = { id: string; payload_json: string }
type MetaRow = { value: string }

export function createSqliteNarrationProjectionStore(
  db: SqliteDatabase,
  scope: NarrationProjectionScope
): NarrationProjectionStore {
  const socialLines = readSocialLines(db, scope.campaignId)
  const sceneBlocks = readSceneBlocks(db, scope.campaignId)
  const nextId = Math.max(readNextId(db, scope.campaignId), nextIdAfter(socialLines, sceneBlocks))
  const memory = createMemoryNarrationProjectionStore({ socialLines, sceneBlocks, nextId })
  return wrapWriteThrough(db, scope, memory)
}

function readSocialLines(db: SqliteDatabase, campaignId: string): SocialLine[] {
  const rows = db
    .prepare(
      `SELECT id, payload_json FROM narration_social_lines
       WHERE campaign_id = ? ORDER BY json_extract(payload_json, '$.at'), id`
    )
    .all(campaignId) as SocialRow[]
  return rows.map((row) => JSON.parse(row.payload_json) as SocialLine)
}

function readSceneBlocks(db: SqliteDatabase, campaignId: string): SceneBlock[] {
  const rows = db
    .prepare(
      `SELECT id, payload_json FROM narration_scene_blocks
       WHERE campaign_id = ? ORDER BY json_extract(payload_json, '$.at'), id`
    )
    .all(campaignId) as SceneRow[]
  return rows.map((row) => JSON.parse(row.payload_json) as SceneBlock)
}

function wrapWriteThrough(
  db: SqliteDatabase,
  scope: NarrationProjectionScope,
  memory: NarrationProjectionStore
): NarrationProjectionStore {
  return {
    clearNarrationStore: () => {
      memory.clearNarrationStore()
      clearRows(db, scope.campaignId)
      writeNextId(db, scope.campaignId, 1)
    },
    projectSocial: () => memory.projectSocial(),
    projectScene: () => memory.projectScene(),
    appendSocialLine: (input) => {
      const line = memory.appendSocialLine(input)
      persistSocialLine(db, scope, line)
      writeNextId(db, scope.campaignId, numericIdSuffix(line.id) + 1)
      return line
    },
    appendSceneBlock: (input) => {
      const block = memory.appendSceneBlock(input)
      persistSceneBlock(db, scope, block)
      writeNextId(db, scope.campaignId, numericIdSuffix(block.id) + 1)
      return block
    },
    restoreNarrationProjections: (snapshot) => {
      memory.restoreNarrationProjections(snapshot)
      clearRows(db, scope.campaignId)
      for (const line of snapshot.socialLines) {
        persistSocialLine(db, scope, line)
      }
      for (const block of snapshot.sceneBlocks) {
        persistSceneBlock(db, scope, block)
      }
      writeNextId(db, scope.campaignId, nextIdAfter(snapshot.socialLines, snapshot.sceneBlocks))
    }
  }
}

function persistSocialLine(
  db: SqliteDatabase,
  scope: NarrationProjectionScope,
  line: SocialLine
): void {
  db.prepare(
    `INSERT INTO narration_social_lines (id, campaign_id, character_id, channel, payload_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       campaign_id = excluded.campaign_id,
       character_id = excluded.character_id,
       channel = excluded.channel,
       payload_json = excluded.payload_json`
  ).run(line.id, scope.campaignId, scope.characterId ?? null, scope.channel ?? null, JSON.stringify(line))
}

function persistSceneBlock(
  db: SqliteDatabase,
  scope: NarrationProjectionScope,
  block: SceneBlock
): void {
  db.prepare(
    `INSERT INTO narration_scene_blocks (id, campaign_id, character_id, channel, payload_json)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       campaign_id = excluded.campaign_id,
       character_id = excluded.character_id,
       channel = excluded.channel,
       payload_json = excluded.payload_json`
  ).run(block.id, scope.campaignId, scope.characterId ?? null, scope.channel ?? null, JSON.stringify(block))
}

function clearRows(db: SqliteDatabase, campaignId: string): void {
  db.prepare('DELETE FROM narration_social_lines WHERE campaign_id = ?').run(campaignId)
  db.prepare('DELETE FROM narration_scene_blocks WHERE campaign_id = ?').run(campaignId)
}

function readNextId(db: SqliteDatabase, campaignId: string): number {
  const row = db.prepare('SELECT value FROM narration_store_meta WHERE key = ?').get(metaKey(campaignId))
  if (!isMetaRow(row)) {
    return 1
  }
  const value = Number(row.value)
  return Number.isInteger(value) && value > 0 ? value : 1
}

function writeNextId(db: SqliteDatabase, campaignId: string, nextId: number): void {
  db.prepare(
    `INSERT INTO narration_store_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(metaKey(campaignId), String(nextId))
}

function nextIdAfter(socialLines: readonly SocialLine[], sceneBlocks: readonly SceneBlock[]): number {
  const ids = [...socialLines, ...sceneBlocks].map((record) => numericIdSuffix(record.id))
  return Math.max(0, ...ids) + 1
}

function numericIdSuffix(id: string): number {
  const suffix = id.split('-').at(-1)
  const value = suffix === undefined ? Number.NaN : Number(suffix)
  return Number.isInteger(value) && value > 0 ? value : 0
}

function metaKey(campaignId: string): string {
  return `next_id:${campaignId}`
}

function isMetaRow(value: unknown): value is MetaRow {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string'
  )
}
