import type Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { CURRENT_CAMPAIGN_SCHEMA_VERSION, campaignMigrations } from './campaignSchema.js'
import {
  UnknownCampaignSchemaVersionError,
  runMigrations,
  type MigrationRunOptions,
  type MigrationRunResult,
  type SqliteDatabase
} from './migrationRunner.js'

export { CURRENT_CAMPAIGN_SCHEMA_VERSION, UnknownCampaignSchemaVersionError }

type DatabaseConstructor = new (filename: string) => Database.Database

const require = createRequire(import.meta.url)

export type CampaignOpenOptions = {
  campaignId: string
  filePath: string
  seedCatalog?: CatalogSeedHook
  now?: () => string
}

export type CampaignHandle = {
  campaignId: string
  filePath: string
  schemaVersion: number
  appliedMigrations: number[]
  close: () => void
}

export type CatalogSeedEntry = {
  catalog: string
  id: string
  version: number
  payloadJson: string
}

export type CatalogSeedWriter = {
  upsert: (entry: CatalogSeedEntry) => void
}

export type CatalogSeedContext = {
  campaignId: string
  schemaVersion: number
  catalog: CatalogSeedWriter
}

export type CatalogSeedHook = (context: CatalogSeedContext) => void

export class CampaignAlreadyExistsError extends Error {
  constructor(filePath: string) {
    super(`Campaign database already exists: ${filePath}`)
    this.name = 'CampaignAlreadyExistsError'
  }
}

export class CampaignNotFoundError extends Error {
  constructor(filePath: string) {
    super(`Campaign database does not exist: ${filePath}`)
    this.name = 'CampaignNotFoundError'
  }
}

export class CampaignIdentityError extends Error {
  constructor(expected: string, actual: string) {
    super(`Campaign id mismatch: expected ${expected}, found ${actual}`)
    this.name = 'CampaignIdentityError'
  }
}

export function createCampaign(options: CampaignOpenOptions): CampaignHandle {
  const filePath = resolve(options.filePath)
  if (existsSync(filePath)) {
    throw new CampaignAlreadyExistsError(filePath)
  }
  mkdirSync(dirname(filePath), { recursive: true })
  return openCampaignInternal({ ...options, filePath })
}

export function openCampaign(options: CampaignOpenOptions): CampaignHandle {
  const filePath = resolve(options.filePath)
  if (!existsSync(filePath)) {
    throw new CampaignNotFoundError(filePath)
  }
  return openCampaignInternal({ ...options, filePath })
}

function openCampaignInternal(options: CampaignOpenOptions): CampaignHandle {
  const db = openSqliteDatabase(options.filePath)
  try {
    const result = runMigrations(db, campaignMigrations, toMigrationOptions(options))
    seedCatalog(db, options, result)
    ensureCampaignMeta(db, options, result)
    return buildHandle(db, options, result)
  } catch (error) {
    db.close()
    throw error
  }
}

function openSqliteDatabase(filePath: string): SqliteDatabase {
  const DatabaseCtor = require('better-sqlite3') as DatabaseConstructor
  return new DatabaseCtor(filePath)
}

function toMigrationOptions(options: CampaignOpenOptions): MigrationRunOptions {
  return options.now ? { now: options.now } : {}
}

function seedCatalog(
  db: SqliteDatabase,
  options: CampaignOpenOptions,
  result: MigrationRunResult
): void {
  if (!options.seedCatalog) {
    return
  }
  const catalog = buildCatalogWriter(db, operationTime(options))
  options.seedCatalog({ campaignId: options.campaignId, schemaVersion: result.targetVersion, catalog })
}

function buildCatalogWriter(db: SqliteDatabase, seededAt: string): CatalogSeedWriter {
  return {
    upsert(entry) {
      upsertCatalogEntry(db, entry, seededAt)
    }
  }
}

function upsertCatalogEntry(
  db: SqliteDatabase,
  entry: CatalogSeedEntry,
  seededAt: string
): void {
  db.prepare(
    `INSERT INTO campaign_catalog_entries (catalog, id, version, payload_json, seeded_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(catalog, id) DO UPDATE SET
       version = excluded.version,
       payload_json = excluded.payload_json,
       seeded_at = excluded.seeded_at`
  ).run(entry.catalog, entry.id, entry.version, entry.payloadJson, seededAt)
}

function ensureCampaignMeta(
  db: SqliteDatabase,
  options: CampaignOpenOptions,
  result: MigrationRunResult
): void {
  const existingCampaignId = readMeta(db, 'campaign_id')
  if (existingCampaignId && existingCampaignId !== options.campaignId) {
    throw new CampaignIdentityError(options.campaignId, existingCampaignId)
  }
  const updatedAt = operationTime(options)
  if (!existingCampaignId) {
    upsertMeta(db, 'campaign_id', options.campaignId, updatedAt)
    upsertMeta(db, 'created_at', updatedAt, updatedAt)
  }
  upsertMeta(db, 'schema_version', String(result.targetVersion), updatedAt)
}

function buildHandle(
  db: SqliteDatabase,
  options: CampaignOpenOptions,
  result: MigrationRunResult
): CampaignHandle {
  let closed = false
  return {
    campaignId: options.campaignId,
    filePath: options.filePath,
    schemaVersion: result.targetVersion,
    appliedMigrations: result.appliedVersions,
    close() {
      if (!closed) {
        db.close()
        closed = true
      }
    }
  }
}

function readMeta(db: SqliteDatabase, key: string): string | undefined {
  const row = db.prepare('SELECT value FROM campaign_meta WHERE key = ?').get(key)
  return isMetaRow(row) ? row.value : undefined
}

function upsertMeta(db: SqliteDatabase, key: string, value: string, updatedAt: string): void {
  db.prepare(
    `INSERT INTO campaign_meta (key, value, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       value = excluded.value,
       updated_at = excluded.updated_at`
  ).run(key, value, updatedAt)
}

function operationTime(options: CampaignOpenOptions): string {
  return options.now?.() ?? new Date().toISOString()
}

function isMetaRow(value: unknown): value is { value: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'value' in value &&
    typeof value.value === 'string'
  )
}
