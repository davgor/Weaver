import type { Aabb, Cell, ExpansionRecord, SparseOverlay, WorldMeta } from '@weaver/world-engine'
import type { RegionRecord, RegionSummary } from '@weaver/regional-engine'
import type { NpcPlaceholderSlot, NpcRoleHint } from './npcPlaceholders.js'

export type { Aabb, Cell, ExpansionRecord, SparseOverlay, WorldMeta, RegionRecord, RegionSummary }
export type { NpcPlaceholderSlot, NpcRoleHint }

export const CIVILIZATION_STATS_VERSION = 1

export const SETTLEMENT_KINDS = [
  'farmHouse',
  'hamlet',
  'village',
  'castle',
  'city'
] as const

export type SettlementKind = (typeof SETTLEMENT_KINDS)[number]

export const LAND_USES = ['building', 'road', 'farmland', 'wall', 'district'] as const
export type LandUse = (typeof LAND_USES)[number]

export type Point = { x: number; y: number }

export type OverlayDraft = {
  x: number
  y: number
  landUse: LandUse
  density?: number
}

export type DraftNpcSlot = {
  roleHint: NpcRoleHint
  priority?: number
  districtTag?: string
}

export type CivilizationRecord = {
  civilizationId: string
  worldId: string
  regionId: string
  kind: SettlementKind
  origin: Point
  bounds: Aabb
  centroid?: Point
  seedSalt: number
  population: number
  npcSlotCount: number
  npcSlotsAssigned: number
  statsVersion: number
  extraStats: Record<string, unknown>
  displayName?: string
  history?: string
  namingRealizedAt?: string
  createdAt: string
  updatedAt: string
}

export type CivilizationCandidate = {
  civilizationId: string
  worldId: string
  regionId: string
  kind: SettlementKind
  origin: Point
  bounds: Aabb
  centroid?: Point
  seedSalt: number
  population: number
  overlays: OverlayDraft[]
  npcSlots: DraftNpcSlot[]
  statsVersion: number
  extraStats: Record<string, unknown>
}

export type ProposeCivilizationsOpts = {
  kinds?: SettlementKind[]
  maxCount?: number
  rngSalt?: number
}

export type FillCivilizationsScope = {
  regionId?: string
  regionIds?: string[]
  expansionId?: string
}

export type PopulationByKind = Partial<Record<SettlementKind, number>>

export type PopulationAggregate = {
  worldId: string
  regionId?: string
  population: number
  byKind: PopulationByKind
}

export type PopulationChange =
  | { delta: number }
  | { absolute: number }

export type CivilizationSummary = {
  civilizationId: string
  worldId: string
  regionId: string
  kind: SettlementKind
  population: number
  npcSlotCount: number
  npcSlotsAssigned: number
  bounds: Aabb
  statsVersion: number
}

export type RegionCivilizationSummary = {
  worldId: string
  regionId: string
  population: number
  settlementCount: number
  settlements: CivilizationSummary[]
}

export type CivilizationRegionalReader = {
  getRegion: (worldId: string, regionId: string) => RegionRecord | null
  getRegionSummary: (worldId: string, regionId: string) => RegionSummary | null
  getRegionCells: (worldId: string, regionId: string) => Point[]
  listRegions: (worldId: string) => RegionRecord[]
  getRegionsInBounds: (worldId: string, bounds: Aabb) => RegionRecord[]
}

export type CivilizationWorldReader = {
  getWorldMeta: (worldId: string) => WorldMeta
  getExpansion: (worldId: string, expansionId: string) => ExpansionRecord | null
  getCell: (args: { worldId: string; x: number; y: number }) => Cell | null
}

export type CivilizationWorldOverlays = {
  upsertOverlays: (overlays: SparseOverlay[]) => void
  deleteOverlaysForCivilization: (worldId: string, civilizationId: string) => void
  listOverlaysAt: (worldId: string, x: number, y: number) => SparseOverlay[]
}

export type CivilizationServiceOptions = {
  dataRoot: string
  regional: CivilizationRegionalReader
  world: CivilizationWorldReader
  overlays?: CivilizationWorldOverlays
}
