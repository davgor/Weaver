import { capacityForKind, clampPopulation, eligibleKinds, slotTargetForPopulation } from './kindRules.js'
import type { NpcRoleHint } from './npcPlaceholders.js'
import { classifyUrbanLandUse, urbanDensityAt } from './urbanDensity.js'
import type {
  CivilizationCandidate,
  CivilizationWorldReader,
  DraftNpcSlot,
  OverlayDraft,
  Point,
  ProposeCivilizationsOpts,
  RegionSummary,
  SettlementKind
} from './types.js'

export type ProposeContext = {
  world: CivilizationWorldReader
  worldId: string
  regionId: string
  summary: RegionSummary
  cells: Point[]
  occupied: Set<string>
  opts?: ProposeCivilizationsOpts
}

function cellKey(x: number, y: number): string {
  return `${x},${y}`
}

function hashId(...parts: Array<string | number>): string {
  let h = 2166136261
  for (const part of parts) {
    const text = String(part)
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i)
      h = Math.imul(h, 16777619)
    }
  }
  return (h >>> 0).toString(36)
}

function seededUnit(seed: number, salt: number): number {
  let h = seed ^ Math.imul(salt, 0x9e3779b9)
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function freeLandCells(ctx: ProposeContext): Point[] {
  return ctx.cells
    .filter((cell) => !ctx.occupied.has(cellKey(cell.x, cell.y)))
    .filter((cell) => {
      const worldCell = ctx.world.getCell({ worldId: ctx.worldId, x: cell.x, y: cell.y })
      return worldCell !== null && worldCell.landType !== 'ocean'
    })
    .sort((a, b) => a.y - b.y || a.x - b.x)
}

function pickKinds(summary: RegionSummary, opts?: ProposeCivilizationsOpts): SettlementKind[] {
  const allowed = eligibleKinds(summary)
  if (!opts?.kinds || opts.kinds.length === 0) return allowed
  return opts.kinds.filter((kind) => allowed.includes(kind))
}

function footprintFor(
  kind: SettlementKind,
  origin: Point,
  free: Point[],
  maxCells: number
): Point[] {
  const selected: Point[] = []
  for (const cell of free) {
    const dx = Math.abs(cell.x - origin.x)
    const dy = Math.abs(cell.y - origin.y)
    const radius = kind === 'city' ? 6 : kind === 'village' ? 3 : kind === 'castle' ? 2 : 1
    if (dx <= radius && dy <= radius) selected.push(cell)
    if (selected.length >= maxCells) break
  }
  if (selected.length === 0) selected.push(origin)
  return selected
}

function boundsOf(cells: Point[]): { minX: number; minY: number; maxX: number; maxY: number } {
  return {
    minX: Math.min(...cells.map((c) => c.x)),
    minY: Math.min(...cells.map((c) => c.y)),
    maxX: Math.max(...cells.map((c) => c.x)),
    maxY: Math.max(...cells.map((c) => c.y))
  }
}

function centroidOf(cells: Point[]): Point {
  const x = cells.reduce((sum, cell) => sum + cell.x, 0) / cells.length
  const y = cells.reduce((sum, cell) => sum + cell.y, 0) / cells.length
  return { x, y }
}

function simpleOverlays(kind: SettlementKind, cells: Point[]): OverlayDraft[] {
  return cells.map((cell, index) => {
    if (kind === 'farmHouse' || kind === 'hamlet') {
      return { x: cell.x, y: cell.y, landUse: index === 0 ? 'building' : 'farmland' }
    }
    if (kind === 'castle') {
      return { x: cell.x, y: cell.y, landUse: index === 0 ? 'building' : 'wall' }
    }
    return { x: cell.x, y: cell.y, landUse: 'building' }
  })
}

function cityOverlays(
  worldSeed: number,
  seedSalt: number,
  cells: Point[]
): OverlayDraft[] {
  return cells.map((cell) => {
    const density = urbanDensityAt({ worldSeed, seedSalt, x: cell.x, y: cell.y })
    return { x: cell.x, y: cell.y, landUse: classifyUrbanLandUse(density), density }
  })
}

function draftSlots(roleHints: readonly NpcRoleHint[], count: number): DraftNpcSlot[] {
  const slots: DraftNpcSlot[] = []
  for (let i = 0; i < count; i++) {
    const roleHint = roleHints[i % roleHints.length]
    if (!roleHint) continue
    slots.push({ roleHint, priority: i + 1 })
  }
  return slots
}

function populationFor(args: {
  kind: SettlementKind
  summary: RegionSummary
  overlays: OverlayDraft[]
  seedSalt: number
  worldSeed: number
}): number {
  const capacity = capacityForKind(args.summary, args.kind)
  if (args.kind === 'city') {
    const buildings = args.overlays.filter((o) => o.landUse === 'building')
    const densitySum = buildings.reduce((sum, o) => sum + (o.density ?? 0.5), 0)
    return clampPopulation(capacity, buildings.length * 12 + densitySum * 40)
  }
  const unit = seededUnit(args.worldSeed, args.seedSalt)
  const raw =
    capacity.minPopulation + unit * (capacity.maxPopulation - capacity.minPopulation)
  return clampPopulation(capacity, raw)
}

function buildCandidate(args: {
  ctx: ProposeContext
  kind: SettlementKind
  origin: Point
  free: Point[]
  sequence: number
}): CivilizationCandidate {
  const { ctx, kind, origin, free, sequence } = args
  const capacity = capacityForKind(ctx.summary, kind)
  const seedSalt =
    (ctx.opts?.rngSalt ?? 0) ^
    Math.imul(sequence + 1, 0x85ebca6b) ^
    Math.imul(origin.x + 1, 374_761_393) ^
    Math.imul(origin.y + 1, 668_265_263)
  const cells = footprintFor(kind, origin, free, capacity.maxFootprintCells)
  const worldSeed = ctx.world.getWorldMeta(ctx.worldId).seed
  const overlays =
    kind === 'city' ? cityOverlays(worldSeed, seedSalt, cells) : simpleOverlays(kind, cells)
  const population = populationFor({
    kind,
    summary: ctx.summary,
    overlays,
    seedSalt,
    worldSeed
  })
  const slotCount = slotTargetForPopulation(capacity, population)
  const civilizationId = `civ_${hashId(ctx.worldId, ctx.regionId, kind, seedSalt, sequence)}`
  return {
    civilizationId,
    worldId: ctx.worldId,
    regionId: ctx.regionId,
    kind,
    origin,
    bounds: boundsOf(cells),
    centroid: centroidOf(cells),
    seedSalt,
    population,
    overlays,
    npcSlots: draftSlots(capacity.roleHints, slotCount),
    statsVersion: 1,
    extraStats: {}
  }
}

function markOccupied(occupied: Set<string>, candidate: CivilizationCandidate): void {
  for (const overlay of candidate.overlays) {
    occupied.add(cellKey(overlay.x, overlay.y))
  }
}

function removeUsedCells(free: Point[], candidate: CivilizationCandidate): void {
  for (const overlay of candidate.overlays) {
    const idx = free.findIndex((c) => c.x === overlay.x && c.y === overlay.y)
    if (idx >= 0) free.splice(idx, 1)
  }
}

function pickOrigin(free: Point[], worldSeed: number, sequence: number): Point | null {
  if (free.length === 0) return null
  const originIndex = Math.floor(seededUnit(worldSeed, sequence + 1) * free.length)
  return free[originIndex] ?? free[0] ?? null
}

function tryNextCandidate(args: {
  ctx: ProposeContext
  kind: SettlementKind
  free: Point[]
  occupied: Set<string>
  sequence: number
}): CivilizationCandidate | null {
  const origin = pickOrigin(args.free, args.ctx.world.getWorldMeta(args.ctx.worldId).seed, args.sequence)
  if (!origin) return null
  const candidate = buildCandidate({
    ctx: args.ctx,
    kind: args.kind,
    origin,
    free: args.free,
    sequence: args.sequence
  })
  if (candidate.overlays.some((o) => args.occupied.has(cellKey(o.x, o.y)))) return null
  return candidate
}

export function proposeCivilizationsForRegion(ctx: ProposeContext): CivilizationCandidate[] {
  const kinds = pickKinds(ctx.summary, ctx.opts)
  if (kinds.length === 0) return []
  const free = freeLandCells(ctx)
  if (free.length === 0) return []
  const maxCount = ctx.opts?.maxCount ?? Math.min(3, kinds.length)
  const occupied = new Set(ctx.occupied)
  const out: CivilizationCandidate[] = []
  const orderedKinds = [...kinds].reverse()
  for (let i = 0; i < maxCount && free.length > 0; i++) {
    const kind = orderedKinds[i % orderedKinds.length]
    if (!kind) break
    const candidate = tryNextCandidate({ ctx, kind, free, occupied, sequence: i })
    if (!candidate) continue
    out.push(candidate)
    markOccupied(occupied, candidate)
    removeUsedCells(free, candidate)
  }
  return out
}
