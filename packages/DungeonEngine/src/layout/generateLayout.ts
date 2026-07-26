import type { TileType } from '../types.js'

type LayoutParams = {
  seed: number
  width: number
  height: number
  floorCount: number
}

type FloorLayout = {
  floorIndex: number
  grid: TileType[][]
}

type DungeonLayout = {
  floors: FloorLayout[]
}

type Rng = () => number
type Rect = { x: number; y: number; w: number; h: number }

function mulberry32(seed: number): Rng {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

function emptyGrid(width: number, height: number): TileType[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => 'wall' as TileType))
}

function cellAt(grid: TileType[][], x: number, y: number): TileType {
  const row = grid[y]
  if (!row) throw new Error(`row out of bounds: ${y}`)
  const tile = row[x]
  if (!tile) throw new Error(`cell out of bounds: ${x},${y}`)
  return tile
}

function setCell(grid: TileType[][], x: number, y: number, tile: TileType): void {
  const row = grid[y]
  if (!row) throw new Error(`row out of bounds: ${y}`)
  row[x] = tile
}

function splitLeaf(leaf: Rect, rng: Rng, minSize: number): [Rect, Rect] | null {
  const canSplitH = leaf.h >= minSize * 2 + 1
  const canSplitV = leaf.w >= minSize * 2 + 1
  if (!canSplitH && !canSplitV) return null
  const splitH = canSplitH && (!canSplitV || rng() < 0.5)
  if (splitH) {
    const cut = minSize + Math.floor(rng() * (leaf.h - minSize * 2 + 1))
    return [
      { x: leaf.x, y: leaf.y, w: leaf.w, h: cut },
      { x: leaf.x, y: leaf.y + cut, w: leaf.w, h: leaf.h - cut }
    ]
  }
  const cut = minSize + Math.floor(rng() * (leaf.w - minSize * 2 + 1))
  return [
    { x: leaf.x, y: leaf.y, w: cut, h: leaf.h },
    { x: leaf.x + cut, y: leaf.y, w: leaf.w - cut, h: leaf.h }
  ]
}

function carveRoom(grid: TileType[][], room: Rect): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) setCell(grid, x, y, 'floor')
  }
}

function placeRoomInLeaf(leaf: Rect, rng: Rng): Rect {
  const maxW = Math.max(3, leaf.w - 2)
  const maxH = Math.max(3, leaf.h - 2)
  const w = 3 + Math.floor(rng() * Math.max(1, maxW - 2))
  const h = 3 + Math.floor(rng() * Math.max(1, maxH - 2))
  const x = leaf.x + 1 + Math.floor(rng() * Math.max(1, leaf.w - w - 1))
  const y = leaf.y + 1 + Math.floor(rng() * Math.max(1, leaf.h - h - 1))
  return { x, y, w, h }
}

function setWalkable(grid: TileType[][], x: number, y: number): void {
  if (cellAt(grid, x, y) === 'wall') setCell(grid, x, y, 'floor')
}

function carveLine(grid: TileType[][], from: { x: number; y: number }, to: { x: number; y: number }): void {
  let x = from.x
  let y = from.y
  while (x !== to.x) {
    setWalkable(grid, x, y)
    x += x < to.x ? 1 : -1
  }
  while (y !== to.y) {
    setWalkable(grid, x, y)
    y += y < to.y ? 1 : -1
  }
  setWalkable(grid, x, y)
}

function roomCenter(room: Rect): { x: number; y: number } {
  return { x: room.x + Math.floor(room.w / 2), y: room.y + Math.floor(room.h / 2) }
}

function connectRooms(grid: TileType[][], a: Rect, b: Rect, rng: Rng): void {
  const ca = roomCenter(a)
  const cb = roomCenter(b)
  if (rng() < 0.5) {
    carveLine(grid, ca, { x: cb.x, y: ca.y })
    carveLine(grid, { x: cb.x, y: ca.y }, cb)
  } else {
    carveLine(grid, ca, { x: ca.x, y: cb.y })
    carveLine(grid, { x: ca.x, y: cb.y }, cb)
  }
}

function isDoorCandidate(grid: TileType[][], x: number, y: number): boolean {
  if (cellAt(grid, x, y) !== 'floor') return false
  const horiz = cellAt(grid, x - 1, y) === 'wall' && cellAt(grid, x + 1, y) === 'wall'
  const vert = cellAt(grid, x, y - 1) === 'wall' && cellAt(grid, x, y + 1) === 'wall'
  const openH = cellAt(grid, x, y - 1) === 'floor' && cellAt(grid, x, y + 1) === 'floor'
  const openV = cellAt(grid, x - 1, y) === 'floor' && cellAt(grid, x + 1, y) === 'floor'
  return (horiz && openH) || (vert && openV)
}

function placeDoors(grid: TileType[][], width: number, height: number): void {
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (isDoorCandidate(grid, x, y)) setCell(grid, x, y, 'door')
    }
  }
}

function partition(leaf: Rect, rng: Rng, minSize: number, depth: number): Rect[] {
  if (depth <= 0) return [leaf]
  const parts = splitLeaf(leaf, rng, minSize)
  if (!parts) return [leaf]
  return [...partition(parts[0], rng, minSize, depth - 1), ...partition(parts[1], rng, minSize, depth - 1)]
}

function generateFloorGrid(seed: number, width: number, height: number): { grid: TileType[][]; rooms: Rect[] } {
  const rng = mulberry32(seed)
  const grid = emptyGrid(width, height)
  const leaves = partition({ x: 0, y: 0, w: width, h: height }, rng, 6, 4)
  const rooms = leaves.map((leaf) => placeRoomInLeaf(leaf, rng))
  for (const room of rooms) carveRoom(grid, room)
  for (let i = 1; i < rooms.length; i++) {
    const prev = rooms[i - 1]
    const curr = rooms[i]
    if (prev && curr) connectRooms(grid, prev, curr, rng)
  }
  placeDoors(grid, width, height)
  return { grid, rooms }
}

function placeStairs(upper: TileType[][], lower: TileType[][], rooms: Rect[]): void {
  const first = rooms[0]
  if (!first) throw new Error('no rooms for stairs')
  const c = roomCenter(first)
  setCell(upper, c.x, c.y, 'stairsDown')
  setCell(lower, c.x, c.y, 'stairsUp')
}

export function generateDungeonLayout(params: LayoutParams): DungeonLayout {
  if (params.width < 12 || params.height < 12) throw new Error('Dungeon size too small')
  if (params.floorCount < 1) throw new Error('floorCount must be >= 1')
  const floors: FloorLayout[] = []
  for (let i = 0; i < params.floorCount; i++) {
    const { grid, rooms } = generateFloorGrid(params.seed + i * 9973, params.width, params.height)
    if (i > 0) {
      const prev = floors[i - 1]
      if (!prev) throw new Error('missing previous floor')
      placeStairs(prev.grid, grid, rooms)
    }
    floors.push({ floorIndex: i, grid })
  }
  return { floors }
}
