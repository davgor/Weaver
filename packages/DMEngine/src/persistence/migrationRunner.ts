import type Database from 'better-sqlite3'

export type SqliteDatabase = Database.Database

export type Migration = {
  version: number
  name: string
  up: (db: SqliteDatabase) => void
}

export type MigrationRunOptions = {
  now?: () => string
}

export type MigrationRunResult = {
  currentVersion: number
  targetVersion: number
  appliedVersions: number[]
}

export class UnknownCampaignSchemaVersionError extends Error {
  constructor(currentVersion: number, targetVersion: number) {
    super(
      `Campaign schema version ${currentVersion} is newer than this DMEngine supports (${targetVersion})`
    )
    this.name = 'UnknownCampaignSchemaVersionError'
  }
}

export class InvalidMigrationSequenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidMigrationSequenceError'
  }
}

export function runMigrations(
  db: SqliteDatabase,
  migrations: readonly Migration[],
  options: MigrationRunOptions = {}
): MigrationRunResult {
  ensureMigrationTable(db)
  const ordered = [...migrations].sort((left, right) => left.version - right.version)
  assertForwardOnlySequence(ordered)
  const currentVersion = readCurrentVersion(db)
  const targetVersion = readTargetVersion(ordered)
  rejectNewerDatabase(currentVersion, targetVersion)
  const appliedVersions = applyPendingMigrations(db, ordered, currentVersion, options)
  return { currentVersion, targetVersion, appliedVersions }
}

function ensureMigrationTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    )
  `)
}

function assertForwardOnlySequence(migrations: readonly Migration[]): void {
  for (const [index, migration] of migrations.entries()) {
    const expectedVersion = index + 1
    if (migration.version !== expectedVersion) {
      throw new InvalidMigrationSequenceError(
        `Expected migration ${expectedVersion}, received ${migration.version}`
      )
    }
  }
}

function readCurrentVersion(db: SqliteDatabase): number {
  const row = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1')
    .get()
  return isVersionRow(row) ? row.version : 0
}

function readTargetVersion(migrations: readonly Migration[]): number {
  const lastMigration = migrations[migrations.length - 1]
  return lastMigration?.version ?? 0
}

function rejectNewerDatabase(currentVersion: number, targetVersion: number): void {
  if (currentVersion > targetVersion) {
    throw new UnknownCampaignSchemaVersionError(currentVersion, targetVersion)
  }
}

function applyPendingMigrations(
  db: SqliteDatabase,
  migrations: readonly Migration[],
  currentVersion: number,
  options: MigrationRunOptions
): number[] {
  const pending = migrations.filter((migration) => migration.version > currentVersion)
  return pending.map((migration) => applyMigration(db, migration, migrationTime(options)))
}

function applyMigration(db: SqliteDatabase, migration: Migration, appliedAt: string): number {
  db.exec('BEGIN')
  try {
    migration.up(db)
    recordMigration(db, migration, appliedAt)
    db.exec(`PRAGMA user_version = ${migration.version}`)
    db.exec('COMMIT')
    return migration.version
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

function recordMigration(db: SqliteDatabase, migration: Migration, appliedAt: string): void {
  db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)').run(
    migration.version,
    migration.name,
    appliedAt
  )
}

function migrationTime(options: MigrationRunOptions): string {
  return options.now?.() ?? new Date().toISOString()
}

function isVersionRow(value: unknown): value is { version: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    typeof value.version === 'number'
  )
}
