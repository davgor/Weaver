import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import type { SparseOverlay } from '@weaver/world-engine'
import { OVERLAY_KEYS } from '../overlayContract.js'
import type { CivilizationWorldOverlays } from '../types.js'

type SqliteDb = Database.Database

function worldDbPath(dataRoot: string, worldId: string): string {
  return join(dataRoot, worldId, 'world.sqlite')
}

function openWorldDb(dataRoot: string, worldId: string): SqliteDb {
  mkdirSync(join(dataRoot, worldId), { recursive: true })
  const db = new Database(worldDbPath(dataRoot, worldId))
  db.exec(`
    CREATE TABLE IF NOT EXISTS overlays (
      worldId TEXT NOT NULL,
      x INTEGER NOT NULL,
      y INTEGER NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      PRIMARY KEY(worldId, x, y, key)
    );
  `)
  return db
}

function runWithDb<T>(dataRoot: string, worldId: string, run: (db: SqliteDb) => T): T {
  const db = openWorldDb(dataRoot, worldId)
  try {
    return run(db)
  } finally {
    db.close()
  }
}

function upsertRows(db: SqliteDb, overlays: readonly SparseOverlay[]): void {
  const stmt = db.prepare(
    `INSERT INTO overlays (worldId, x, y, key, value)
     VALUES (@worldId, @x, @y, @key, @value)
     ON CONFLICT(worldId, x, y, key) DO UPDATE SET value = excluded.value`
  )
  const tx = db.transaction((rows: readonly SparseOverlay[]) => {
    for (const row of rows) stmt.run(row)
  })
  tx(overlays)
}

export function createWorldOverlayAdapter(dataRoot: string): CivilizationWorldOverlays {
  return {
    upsertOverlays(overlays) {
      if (overlays.length === 0) return
      const worldId = overlays[0]?.worldId
      if (!worldId) return
      runWithDb(dataRoot, worldId, (db) => upsertRows(db, overlays))
    },
    deleteOverlaysForCivilization(worldId, civilizationId) {
      runWithDb(dataRoot, worldId, (db) => {
        const cells = db
          .prepare(
            `SELECT x, y FROM overlays
             WHERE worldId = ? AND key = ? AND value = ?`
          )
          .all(worldId, OVERLAY_KEYS.civilizationId, civilizationId) as { x: number; y: number }[]
        const del = db.prepare(
          `DELETE FROM overlays WHERE worldId = ? AND x = ? AND y = ? AND key IN (?, ?, ?)`
        )
        const tx = db.transaction((points: { x: number; y: number }[]) => {
          for (const point of points) {
            del.run(
              worldId,
              point.x,
              point.y,
              OVERLAY_KEYS.civilizationId,
              OVERLAY_KEYS.landUse,
              OVERLAY_KEYS.density
            )
          }
        })
        tx(cells)
      })
    },
    listOverlaysAt(worldId, x, y) {
      return runWithDb(dataRoot, worldId, (db) => {
        const rows = db
          .prepare(`SELECT worldId, x, y, key, value FROM overlays WHERE worldId = ? AND x = ? AND y = ?`)
          .all(worldId, x, y) as SparseOverlay[]
        return rows.map((row) => ({ ...row }))
      })
    }
  }
}
