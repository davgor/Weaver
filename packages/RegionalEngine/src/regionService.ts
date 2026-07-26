import { createRegionStore, type RegionStore } from './store/regionStore.js'
import { findRegionCandidates, membershipKey, resolveScopeBounds } from './segmentation.js'
import type {
  Aabb,
  RegionCandidate,
  RegionRecord,
  RegionalService,
  RegionalServiceOptions,
  RegionalWorldReader,
  RegionScope,
  RegionSummary
} from './types.js'
import { regionSummary } from './types.js'

export type {
  RegionCandidate,
  RegionRecord,
  RegionalService,
  RegionalServiceOptions,
  RegionalWorldReader,
  RegionScope,
  RegionSummary
}

function nowIso(): string {
  return new Date().toISOString()
}

function recordFromCandidate(worldId: string, candidate: RegionCandidate, existing?: RegionRecord): RegionRecord {
  const timestamp = nowIso()
  const record: RegionRecord = {
    regionId: candidate.regionId,
    worldId,
    dominantLandType: candidate.dominantLandType,
    landTypeHistogram: { ...candidate.landTypeHistogram },
    averageElevation: candidate.averageElevation,
    minElevation: candidate.minElevation,
    maxElevation: candidate.maxElevation,
    waterContent: candidate.waterContent,
    isOcean: candidate.isOcean,
    touchesOcean: candidate.touchesOcean,
    isLandlocked: candidate.isLandlocked,
    cellCount: candidate.cellCount,
    bounds: { ...candidate.bounds },
    centroid: { ...candidate.centroid },
    statsVersion: candidate.statsVersion,
    extraStats: { ...candidate.extraStats },
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  }
  if (candidate.sourceExpansionId !== undefined) record.sourceExpansionId = candidate.sourceExpansionId
  return record
}

function occupiedKeys(store: RegionStore, worldId: string, bounds: Aabb | null): Set<string> {
  if (!bounds) return new Set()
  return new Set(store.listMembershipInBounds(worldId, bounds).map(membershipKey))
}

function validateWorldId(worldId: string): void {
  if (!worldId.trim()) throw new Error('worldId required')
}

class DefaultRegionalService implements RegionalService {
  private readonly store: RegionStore
  private readonly world: RegionalWorldReader

  constructor(options: RegionalServiceOptions) {
    this.store = createRegionStore(options.dataRoot)
    this.world = options.world
  }

  findNewRegion(worldId: string, scope?: RegionScope): RegionCandidate[] {
    validateWorldId(worldId)
    const bounds = resolveScopeBounds(this.world, worldId, scope)
    const args = {
      world: this.world,
      worldId,
      occupied: occupiedKeys(this.store, worldId, bounds)
    }
    return scope === undefined ? findRegionCandidates(args) : findRegionCandidates({ ...args, scope })
  }

  createRegion(worldId: string, candidate: RegionCandidate): RegionRecord {
    validateWorldId(worldId)
    if (candidate.worldId !== worldId) throw new Error('candidate worldId mismatch')
    const existing = this.store.getRegion(worldId, candidate.regionId) ?? undefined
    return this.store.saveRegion(recordFromCandidate(worldId, candidate, existing), candidate.cells)
  }

  fillRegions(worldId: string, scope?: RegionScope): RegionRecord[] {
    return this.findNewRegion(worldId, scope).map((candidate) => this.createRegion(worldId, candidate))
  }

  getRegion(worldId: string, regionId: string): RegionRecord | null {
    validateWorldId(worldId)
    return this.store.getRegion(worldId, regionId)
  }

  listRegions(worldId: string): RegionRecord[] {
    validateWorldId(worldId)
    return this.store.listRegions(worldId)
  }

  getRegionAt(worldId: string, x: number, y: number): RegionRecord | null {
    validateWorldId(worldId)
    return this.store.getRegionAt(worldId, x, y)
  }

  getRegionsInBounds(worldId: string, bounds: Aabb): RegionRecord[] {
    validateWorldId(worldId)
    return this.store.getRegionsInBounds(worldId, bounds)
  }

  getRegionCells(worldId: string, regionId: string): { x: number; y: number }[] {
    validateWorldId(worldId)
    return this.store.getRegionCells(worldId, regionId)
  }

  getRegionSummary(worldId: string, regionId: string): RegionSummary | null {
    const region = this.getRegion(worldId, regionId)
    return region ? regionSummary(region) : null
  }

  clearRegions(worldId: string): void {
    validateWorldId(worldId)
    this.store.clearRegions(worldId)
  }

  deleteRegion(worldId: string, regionId: string): void {
    validateWorldId(worldId)
    this.store.deleteRegion(worldId, regionId)
  }

  hasRegions(worldId: string): boolean {
    return this.countRegions(worldId) > 0
  }

  countRegions(worldId: string): number {
    validateWorldId(worldId)
    return this.store.countRegions(worldId)
  }

  updateRegionNaming(
    worldId: string,
    regionId: string,
    naming: { displayName: string; history: string; namingRealizedAt: string }
  ): RegionRecord {
    validateWorldId(worldId)
    const existing = this.store.getRegion(worldId, regionId)
    if (existing === null) {
      throw new Error(`Region not found: ${regionId}`)
    }
    const updated: RegionRecord = {
      ...existing,
      displayName: naming.displayName,
      history: naming.history,
      namingRealizedAt: naming.namingRealizedAt,
      updatedAt: nowIso()
    }
    const cells = this.store.getRegionCells(worldId, regionId)
    return this.store.saveRegion(updated, cells)
  }
}

export function createRegionalService(options: RegionalServiceOptions): RegionalService {
  return new DefaultRegionalService(options)
}
