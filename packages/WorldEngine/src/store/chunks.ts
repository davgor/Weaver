import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHUNK_SIZE, decodeLandType, encodeLandType, type Cell } from '../types.js'

type ChunkRef = {
  dataRoot: string
  worldId: string
  cx: number
  cy: number
}

type LoadedChunk = {
  ref: ChunkRef
  buffer: Buffer
}

const BYTES_PER_CELL = 3
const CHUNK_BYTES = CHUNK_SIZE * CHUNK_SIZE * BYTES_PER_CELL

export function chunkId(cx: number, cy: number): string {
  return `c${cx}_${cy}`
}

export function chunkFileName(cx: number, cy: number): string {
  return `${chunkId(cx, cy)}.bin`
}

function chunkPath(ref: ChunkRef): string {
  return join(ref.dataRoot, ref.worldId, 'chunks', chunkFileName(ref.cx, ref.cy))
}

export function chunkBounds(cx: number, cy: number): { minX: number; minY: number; maxX: number; maxY: number } {
  const minX = cx * CHUNK_SIZE
  const minY = cy * CHUNK_SIZE
  return { minX, minY, maxX: minX + CHUNK_SIZE - 1, maxY: minY + CHUNK_SIZE - 1 }
}

function chunkCoord(value: number): number {
  return Math.floor(value / CHUNK_SIZE)
}

function localCoord(value: number, chunk: number): number {
  return value - chunk * CHUNK_SIZE
}

function offset(lx: number, ly: number): number {
  return (ly * CHUNK_SIZE + lx) * BYTES_PER_CELL
}

function encodeElevation(elevation: number): number {
  return Math.round(Math.max(0, Math.min(1, elevation)) * 65_535)
}

function decodeElevation(encoded: number): number {
  return encoded / 65_535
}

function loadChunk(ref: ChunkRef): Buffer {
  const path = chunkPath(ref)
  if (!existsSync(path)) return Buffer.alloc(CHUNK_BYTES)
  const buffer = readFileSync(path)
  if (buffer.length !== CHUNK_BYTES) throw new Error(`Invalid chunk size: ${path}`)
  return Buffer.from(buffer)
}

function saveChunk(chunk: LoadedChunk): void {
  const path = chunkPath(chunk.ref)
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, chunk.buffer)
}

function writeBufferedCell(buffer: Buffer, cell: Cell): void {
  const cx = chunkCoord(cell.x)
  const cy = chunkCoord(cell.y)
  const lx = localCoord(cell.x, cx)
  const ly = localCoord(cell.y, cy)
  const at = offset(lx, ly)
  buffer.writeUInt16BE(encodeElevation(cell.elevation), at)
  buffer[at + 2] = encodeLandType(cell.landType)
}

function readBufferedCell(buffer: Buffer, x: number, y: number): Cell {
  const cx = chunkCoord(x)
  const cy = chunkCoord(y)
  const lx = localCoord(x, cx)
  const ly = localCoord(y, cy)
  const at = offset(lx, ly)
  return {
    x,
    y,
    elevation: decodeElevation(buffer.readUInt16BE(at)),
    landType: decodeLandType(buffer[at + 2] ?? 0)
  }
}

export function writeCells(args: { dataRoot: string; worldId: string; cells: Iterable<Cell> }): Set<string> {
  const chunks = new Map<string, LoadedChunk>()
  for (const cell of args.cells) {
    const cx = chunkCoord(cell.x)
    const cy = chunkCoord(cell.y)
    const id = chunkId(cx, cy)
    const loaded = chunks.get(id) ?? { ref: { dataRoot: args.dataRoot, worldId: args.worldId, cx, cy }, buffer: loadChunk({ dataRoot: args.dataRoot, worldId: args.worldId, cx, cy }) }
    writeBufferedCell(loaded.buffer, cell)
    chunks.set(id, loaded)
  }
  for (const chunk of chunks.values()) saveChunk(chunk)
  return new Set(chunks.keys())
}

export function readChunkCell(args: { dataRoot: string; worldId: string; x: number; y: number }): Cell {
  const cx = chunkCoord(args.x)
  const cy = chunkCoord(args.y)
  const ref = { dataRoot: args.dataRoot, worldId: args.worldId, cx, cy }
  const path = chunkPath(ref)
  if (!existsSync(path)) throw new Error(`Missing chunk for ${args.worldId} (${cx},${cy})`)
  return readBufferedCell(readFileSync(path), args.x, args.y)
}
