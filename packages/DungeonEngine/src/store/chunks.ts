import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { CHUNK_SIZE, type TileType, encodeTile, decodeTile } from '../types.js'

type ChunkRef = {
  dataRoot: string
  dungeonId: string
  floorIndex: number
  cx: number
  cy: number
}

function chunkFile(ref: ChunkRef): string {
  return join(ref.dataRoot, ref.dungeonId, 'chunks', `f${ref.floorIndex}_${ref.cx}_${ref.cy}.bin`)
}

export function writeChunk(ref: ChunkRef, tiles: TileType[]): string {
  const buf = Buffer.alloc(CHUNK_SIZE * CHUNK_SIZE)
  for (let i = 0; i < tiles.length; i++) {
    const tile = tiles[i] ?? 'wall'
    buf[i] = encodeTile(tile)
  }
  const path = chunkFile(ref)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, buf)
  return `f${ref.floorIndex}_${ref.cx}_${ref.cy}`
}

export function readChunkTile(args: {
  dataRoot: string
  dungeonId: string
  floorIndex: number
  x: number
  y: number
}): TileType {
  const cx = Math.floor(args.x / CHUNK_SIZE)
  const cy = Math.floor(args.y / CHUNK_SIZE)
  const path = chunkFile({
    dataRoot: args.dataRoot,
    dungeonId: args.dungeonId,
    floorIndex: args.floorIndex,
    cx,
    cy
  })
  if (!existsSync(path)) {
    throw new Error(`Missing chunk for ${args.dungeonId} (${args.floorIndex},${cx},${cy})`)
  }
  const buf = readFileSync(path)
  const lx = args.x - cx * CHUNK_SIZE
  const ly = args.y - cy * CHUNK_SIZE
  return decodeTile(buf[ly * CHUNK_SIZE + lx] ?? 0)
}

export function collectChunkTiles(grid: TileType[][], cx: number, cy: number): TileType[] {
  const tiles: TileType[] = []
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const x = cx * CHUNK_SIZE + lx
      const y = cy * CHUNK_SIZE + ly
      const row = grid[y]
      const tile = row?.[x]
      tiles.push(tile ?? 'wall')
    }
  }
  return tiles
}
