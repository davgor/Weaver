import type { Aabb, Cell, ExpansionRecord, LandType, WorldMeta } from '@weaver/world-engine'

export type { Aabb, Cell, ExpansionRecord, LandType, WorldMeta }

export const REGION_STATS_VERSION = 1

export type RegionScope = {
  expansionId?: string
  bounds?: Aabb
}

export type RegionCellRef = {
  x: number
  y: number
}

export type RegionCentroid = {
  x: number
  y: number
}

export type LandTypeHistogram = Partial<Record<LandType, number>>

export type RegionStats = {
  dominantLandType: LandType
  landTypeHistogram: LandTypeHistogram
  averageElevation: number
  minElevation: number
  maxElevation: number
  waterContent: number
  isOcean: boolean
  touchesOcean: boolean
  isLandlocked: boolean
  cellCount: number
  bounds: Aabb
  centroid: RegionCentroid
  statsVersion: number
  extraStats: Record<string, unknown>
}

export type RegionRecord = RegionStats & {
  regionId: string
  worldId: string
  sourceExpansionId?: string
  createdAt: string
  updatedAt: string
}

export type RegionCandidate = Omit<RegionRecord, 'createdAt' | 'updatedAt'> & {
  cells: RegionCellRef[]
}

export type RegionSummary = Pick<
  RegionRecord,
  | 'regionId'
  | 'worldId'
  | 'sourceExpansionId'
  | 'dominantLandType'
  | 'landTypeHistogram'
  | 'averageElevation'
  | 'minElevation'
  | 'maxElevation'
  | 'waterContent'
  | 'isOcean'
  | 'touchesOcean'
  | 'isLandlocked'
  | 'cellCount'
  | 'bounds'
  | 'centroid'
  | 'statsVersion'
  | 'extraStats'
>

export type RegionalWorldReader = {
  getWorldMeta: (worldId: string) => WorldMeta
  getWorldBounds: (worldId: string) => Aabb
  getExpansion: (worldId: string, expansionId: string) => ExpansionRecord | null
  getCell: (args: { worldId: string; x: number; y: number }) => Cell | null
  getWorldSpecific: (args: { worldId: string; bounds: Aabb }) => Cell[]
}

export type RegionalServiceOptions = {
  dataRoot: string
  world: RegionalWorldReader
}

export type RegionalService = {
  findNewRegion: (worldId: string, scope?: RegionScope) => RegionCandidate[]
  createRegion: (worldId: string, candidate: RegionCandidate) => RegionRecord
  fillRegions: (worldId: string, scope?: RegionScope) => RegionRecord[]
  getRegion: (worldId: string, regionId: string) => RegionRecord | null
  listRegions: (worldId: string) => RegionRecord[]
  getRegionAt: (worldId: string, x: number, y: number) => RegionRecord | null
  getRegionsInBounds: (worldId: string, bounds: Aabb) => RegionRecord[]
  getRegionCells: (worldId: string, regionId: string) => RegionCellRef[]
  getRegionSummary: (worldId: string, regionId: string) => RegionSummary | null
  clearRegions: (worldId: string) => void
  deleteRegion: (worldId: string, regionId: string) => void
  hasRegions: (worldId: string) => boolean
  countRegions: (worldId: string) => number
}

export function regionSummary(record: RegionRecord): RegionSummary {
  const summary: RegionSummary = {
    regionId: record.regionId,
    worldId: record.worldId,
    dominantLandType: record.dominantLandType,
    landTypeHistogram: { ...record.landTypeHistogram },
    averageElevation: record.averageElevation,
    minElevation: record.minElevation,
    maxElevation: record.maxElevation,
    waterContent: record.waterContent,
    isOcean: record.isOcean,
    touchesOcean: record.touchesOcean,
    isLandlocked: record.isLandlocked,
    cellCount: record.cellCount,
    bounds: { ...record.bounds },
    centroid: { ...record.centroid },
    statsVersion: record.statsVersion,
    extraStats: { ...record.extraStats }
  }
  if (record.sourceExpansionId !== undefined) summary.sourceExpansionId = record.sourceExpansionId
  return summary
}
