import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type {
  DungeonConnection,
  DungeonMeta,
  DungeonRoom,
  FloorRecord,
  OverworldEntrance,
  SparseOverlay
} from '../types.js'

export type MetaFile = {
  meta: DungeonMeta
  floors: FloorRecord[]
  rooms: DungeonRoom[]
  connections: DungeonConnection[]
  overlays: SparseOverlay[]
  chunkManifest: string[]
  entrance: OverworldEntrance | null
}

function dungeonDir(dataRoot: string, dungeonId: string): string {
  return join(dataRoot, dungeonId)
}

function metaPath(dataRoot: string, dungeonId: string): string {
  return join(dungeonDir(dataRoot, dungeonId), 'meta.json')
}

export function readMeta(dataRoot: string, dungeonId: string): MetaFile {
  const path = metaPath(dataRoot, dungeonId)
  if (!existsSync(path)) throw new Error(`Dungeon not found: ${dungeonId}`)
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as Partial<MetaFile> & {
    meta: DungeonMeta
    floors: FloorRecord[]
  }
  return {
    meta: parsed.meta,
    floors: parsed.floors,
    rooms: parsed.rooms ?? [],
    connections: parsed.connections ?? [],
    overlays: parsed.overlays ?? [],
    chunkManifest: parsed.chunkManifest ?? [],
    entrance: parsed.entrance ?? null
  }
}

export function writeMeta(dataRoot: string, dungeonId: string, file: MetaFile): void {
  mkdirSync(dungeonDir(dataRoot, dungeonId), { recursive: true })
  writeFileSync(metaPath(dataRoot, dungeonId), JSON.stringify(file, null, 2))
}

export function hasMeta(dataRoot: string, dungeonId: string): boolean {
  return existsSync(metaPath(dataRoot, dungeonId))
}

export function listDungeonIds(dataRoot: string): string[] {
  return readdirSync(dataRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory() && hasMeta(dataRoot, d.name))
    .map((d) => d.name)
    .sort()
}

export function removeDungeonDir(dataRoot: string, dungeonId: string): void {
  rmSync(dungeonDir(dataRoot, dungeonId), { recursive: true, force: true })
}
