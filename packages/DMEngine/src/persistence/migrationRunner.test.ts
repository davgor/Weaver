import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import {
  UnknownCampaignSchemaVersionError,
  type Migration,
  runMigrations
} from './migrationRunner.js'

describe('runMigrations', () => {
  it('applies pending numbered migrations in order', () => {
    const db = new Database(':memory:')
    const applied: string[] = []
    const migrations = buildProbeMigrations(applied)

    const result = runMigrations(db, migrations, { now: () => '2026-07-26T00:00:00.000Z' })

    expect(applied).toEqual(['one', 'two'])
    expect(result).toMatchObject({ currentVersion: 0, targetVersion: 2, appliedVersions: [1, 2] })
    expect(readVersions(db)).toEqual([1, 2])
    db.close()
  })

  it('does nothing when the database is already up to date', () => {
    const db = new Database(':memory:')
    const firstCalls: string[] = []
    runMigrations(db, buildProbeMigrations(firstCalls), { now: () => '2026-07-26T00:00:00.000Z' })

    const secondCalls: string[] = []
    const result = runMigrations(db, buildProbeMigrations(secondCalls), {
      now: () => '2026-07-26T00:00:00.000Z'
    })

    expect(secondCalls).toEqual([])
    expect(result).toMatchObject({ currentVersion: 2, targetVersion: 2, appliedVersions: [] })
    expect(readVersions(db)).toEqual([1, 2])
    db.close()
  })

  it('rejects databases from newer unknown schema versions', () => {
    const db = new Database(':memory:')
    db.exec(`
      CREATE TABLE schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );
      INSERT INTO schema_migrations (version, name, applied_at)
      VALUES (3, 'future_schema', '2026-07-26T00:00:00.000Z');
    `)

    expect(() => runMigrations(db, buildProbeMigrations([]))).toThrow(
      UnknownCampaignSchemaVersionError
    )
    db.close()
  })
})

function buildProbeMigrations(calls: string[]): Migration[] {
  return [
    {
      version: 1,
      name: 'one',
      up(db) {
        db.exec('CREATE TABLE one_probe (id TEXT PRIMARY KEY)')
        calls.push('one')
      }
    },
    {
      version: 2,
      name: 'two',
      up(db) {
        db.exec('CREATE TABLE two_probe (id TEXT PRIMARY KEY)')
        calls.push('two')
      }
    }
  ]
}

function readVersions(db: Database.Database): number[] {
  const rows = db
    .prepare('SELECT version FROM schema_migrations ORDER BY version')
    .all() as Array<{ version: number }>
  return rows.map((row) => row.version)
}
