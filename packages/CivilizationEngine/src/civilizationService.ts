import { createCivilizationStore, type CivilizationStore } from './store/civilizationStore.js'
import { createWorldOverlayAdapter } from './store/worldOverlayAdapter.js'
import { overlaysFromDraft } from './overlayContract.js'
import { ensureSlotsForRecord } from './ensureSlots.js'
import { proposeCivilizationsForRegion } from './propose.js'
import {
  applyClaim,
  applyRelease,
  assertRoleHint,
  buildSlotId,
  copySlot,
  matchesUnassignedFilter,
  type EnsureNpcPlaceholdersInput,
  type ListUnassignedFilter,
  type NpcPlaceholderSlot
} from './npcPlaceholders.js'
import { aggregateFromRecords, applyPopulationChange } from './population.js'
import type {
  CivilizationCandidate,
  CivilizationRecord,
  CivilizationRegionalReader,
  CivilizationServiceOptions,
  CivilizationSummary,
  CivilizationWorldOverlays,
  CivilizationWorldReader,
  FillCivilizationsScope,
  PopulationAggregate,
  PopulationChange,
  ProposeCivilizationsOpts,
  RegionCivilizationSummary,
  SettlementMutation
} from './types.js'

export type CivilizationService = {
  proposeCivilizations: (
    worldId: string,
    regionId: string,
    opts?: ProposeCivilizationsOpts
  ) => CivilizationCandidate[]
  createCivilization: (worldId: string, candidate: CivilizationCandidate) => CivilizationRecord
  fillCivilizations: (worldId: string, scope?: FillCivilizationsScope) => CivilizationRecord[]
  getPopulation: (worldId: string) => PopulationAggregate
  getRegionPopulation: (worldId: string, regionId: string) => PopulationAggregate
  getCivilizationPopulation: (worldId: string, civilizationId: string) => number
  adjustPopulation: (
    worldId: string,
    civilizationId: string,
    change: PopulationChange
  ) => CivilizationRecord
  applySettlementMutation: (
    worldId: string,
    civilizationId: string,
    mutation: SettlementMutation
  ) => CivilizationRecord
  reconcilePopulation: (worldId: string, regionId?: string) => PopulationAggregate
  listNpcPlaceholders: (worldId: string, civilizationId: string) => NpcPlaceholderSlot[]
  listUnassignedNpcPlaceholders: (
    worldId: string,
    filter?: ListUnassignedFilter
  ) => NpcPlaceholderSlot[]
  claimNpcPlaceholder: (worldId: string, slotId: string, npcId: string) => NpcPlaceholderSlot
  releaseNpcPlaceholder: (worldId: string, slotId: string) => NpcPlaceholderSlot
  ensureNpcPlaceholders: (
    worldId: string,
    civilizationId: string,
    input?: Partial<EnsureNpcPlaceholdersInput>
  ) => NpcPlaceholderSlot[]
  getCivilization: (worldId: string, civilizationId: string) => CivilizationRecord | null
  listCivilizations: (worldId: string) => CivilizationRecord[]
  listCivilizationsInRegion: (worldId: string, regionId: string) => CivilizationRecord[]
  getCivilizationAt: (worldId: string, x: number, y: number) => CivilizationRecord | null
  getCivilizationsInBounds: (
    worldId: string,
    query: { x: number; y: number; length: number; width: number }
  ) => CivilizationRecord[]
  getCivilizationSummary: (worldId: string, civilizationId: string) => CivilizationSummary | null
  getRegionCivilizationSummary: (
    worldId: string,
    regionId: string
  ) => RegionCivilizationSummary | null
  hasCivilizations: (worldId: string) => boolean
  countCivilizations: (worldId: string) => number
  deleteCivilization: (worldId: string, civilizationId: string) => void
  clearCivilizations: (worldId: string, regionId?: string) => void
  updateSettlementNaming: (
    worldId: string,
    civilizationId: string,
    naming: { displayName: string; history: string; namingRealizedAt: string }
  ) => CivilizationRecord
}

function nowIso(): string {
  return new Date().toISOString()
}

function requireWorldId(worldId: string): void {
  if (!worldId.trim()) throw new Error('worldId required')
}

function toSummary(record: CivilizationRecord): CivilizationSummary {
  return {
    civilizationId: record.civilizationId,
    worldId: record.worldId,
    regionId: record.regionId,
    kind: record.kind,
    population: record.population,
    npcSlotCount: record.npcSlotCount,
    npcSlotsAssigned: record.npcSlotsAssigned,
    bounds: { ...record.bounds },
    statsVersion: record.statsVersion,
    mutationStatus: record.mutationStatus ?? 'intact'
  }
}

function claimedKeys(store: CivilizationStore, worldId: string): Set<string> {
  return new Set(store.listClaimedCells(worldId).map((cell) => `${cell.x},${cell.y}`))
}

function recordFromCandidate(
  candidate: CivilizationCandidate,
  existing?: CivilizationRecord
): CivilizationRecord {
  const timestamp = nowIso()
  const slotsAssigned = existing?.npcSlotsAssigned ?? 0
  const record: CivilizationRecord = {
    civilizationId: candidate.civilizationId,
    worldId: candidate.worldId,
    regionId: candidate.regionId,
    kind: candidate.kind,
    origin: { ...candidate.origin },
    bounds: { ...candidate.bounds },
    seedSalt: candidate.seedSalt,
    population: candidate.population,
    mutationStatus: existing?.mutationStatus ?? 'intact',
    npcSlotCount: candidate.npcSlots.length,
    npcSlotsAssigned: slotsAssigned,
    statsVersion: candidate.statsVersion,
    extraStats: { ...candidate.extraStats },
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp
  }
  if (candidate.centroid) record.centroid = { ...candidate.centroid }
  return record
}

function createSlotsFromCandidate(candidate: CivilizationCandidate): NpcPlaceholderSlot[] {
  return candidate.npcSlots.map((draft, index) => {
    assertRoleHint(draft.roleHint)
    const slot: NpcPlaceholderSlot = {
      slotId: buildSlotId(candidate.civilizationId, draft.roleHint, index + 1),
      civilizationId: candidate.civilizationId,
      worldId: candidate.worldId,
      regionId: candidate.regionId,
      roleHint: draft.roleHint,
      status: 'unassigned'
    }
    if (draft.priority !== undefined) slot.priority = draft.priority
    if (draft.districtTag !== undefined) slot.districtTag = draft.districtTag
    return slot
  })
}

function resolveRegionIds(
  regional: CivilizationRegionalReader,
  world: CivilizationWorldReader,
  worldId: string,
  scope?: FillCivilizationsScope
): string[] {
  if (scope?.regionId) return [scope.regionId]
  if (scope?.regionIds && scope.regionIds.length > 0) return [...scope.regionIds]
  if (scope?.expansionId) {
    const expansion = world.getExpansion(worldId, scope.expansionId)
    if (!expansion) throw new Error(`Expansion not found: ${scope.expansionId}`)
    return regional.getRegionsInBounds(worldId, expansion.addedBounds).map((r) => r.regionId)
  }
  return regional.listRegions(worldId).map((r) => r.regionId)
}

class DefaultCivilizationService implements CivilizationService {
  private readonly store: CivilizationStore
  private readonly regional: CivilizationRegionalReader
  private readonly world: CivilizationWorldReader
  private readonly overlays: CivilizationWorldOverlays

  constructor(options: CivilizationServiceOptions) {
    this.store = createCivilizationStore(options.dataRoot)
    this.regional = options.regional
    this.world = options.world
    this.overlays = options.overlays ?? createWorldOverlayAdapter(options.dataRoot)
  }

  proposeCivilizations(
    worldId: string,
    regionId: string,
    opts?: ProposeCivilizationsOpts
  ): CivilizationCandidate[] {
    requireWorldId(worldId)
    const summary = this.regional.getRegionSummary(worldId, regionId)
    if (!summary) throw new Error(`Region not found: ${regionId}`)
    const ctx = {
      world: this.world,
      worldId,
      regionId,
      summary,
      cells: this.regional.getRegionCells(worldId, regionId),
      occupied: claimedKeys(this.store, worldId)
    }
    return opts === undefined
      ? proposeCivilizationsForRegion(ctx)
      : proposeCivilizationsForRegion({ ...ctx, opts })
  }

  createCivilization(worldId: string, candidate: CivilizationCandidate): CivilizationRecord {
    requireWorldId(worldId)
    if (candidate.worldId !== worldId) throw new Error('candidate worldId mismatch')
    const existing = this.store.getCivilization(worldId, candidate.civilizationId) ?? undefined
    const record = recordFromCandidate(candidate, existing)
    const cells = candidate.overlays.map((o) => ({ x: o.x, y: o.y }))
    this.store.saveCivilization(record, cells)
    if (!existing) {
      this.store.saveSlots(createSlotsFromCandidate(candidate))
    }
    this.overlays.upsertOverlays(overlaysFromDraft(worldId, candidate.civilizationId, candidate.overlays))
    return this.store.getCivilization(worldId, candidate.civilizationId) ?? record
  }

  fillCivilizations(worldId: string, scope?: FillCivilizationsScope): CivilizationRecord[] {
    requireWorldId(worldId)
    const created: CivilizationRecord[] = []
    for (const regionId of resolveRegionIds(this.regional, this.world, worldId, scope)) {
      if (this.store.listInRegion(worldId, regionId).length > 0) continue
      for (const candidate of this.proposeCivilizations(worldId, regionId)) {
        const blocked = candidate.overlays.some(
          (o) => this.store.getAt(worldId, o.x, o.y) !== null
        )
        if (blocked) continue
        const existing = this.store.getCivilization(worldId, candidate.civilizationId)
        if (existing) continue
        created.push(this.createCivilization(worldId, candidate))
      }
    }
    return created
  }

  getPopulation(worldId: string): PopulationAggregate {
    requireWorldId(worldId)
    return aggregateFromRecords(worldId, this.store.listCivilizations(worldId))
  }

  getRegionPopulation(worldId: string, regionId: string): PopulationAggregate {
    requireWorldId(worldId)
    return aggregateFromRecords(worldId, this.store.listInRegion(worldId, regionId), regionId)
  }

  getCivilizationPopulation(worldId: string, civilizationId: string): number {
    requireWorldId(worldId)
    return this.store.getCivilization(worldId, civilizationId)?.population ?? 0
  }

  adjustPopulation(
    worldId: string,
    civilizationId: string,
    change: PopulationChange
  ): CivilizationRecord {
    requireWorldId(worldId)
    const record = this.store.getCivilization(worldId, civilizationId)
    if (!record) throw new Error(`Civilization not found: ${civilizationId}`)
    const population = applyPopulationChange(record.population, change)
    const updated = { ...record, population, updatedAt: nowIso() }
    this.store.saveCivilization(updated, this.store.listClaimedCells(worldId).filter((cell) => {
      const owner = this.store.getAt(worldId, cell.x, cell.y)
      return owner?.civilizationId === civilizationId
    }))
    this.ensureNpcPlaceholders(worldId, civilizationId)
    return this.store.getCivilization(worldId, civilizationId) ?? updated
  }

  applySettlementMutation(
    worldId: string,
    civilizationId: string,
    mutation: SettlementMutation
  ): CivilizationRecord {
    requireWorldId(worldId)
    const record = this.store.getCivilization(worldId, civilizationId)
    if (!record) throw new Error(`Civilization not found: ${civilizationId}`)
    const updated = {
      ...record,
      mutationStatus: settlementStatus(record.mutationStatus, mutation),
      population: settlementPopulation(record.population, mutation),
      updatedAt: nowIso()
    }
    this.store.saveCivilization(updated, this.cellsForCivilization(worldId, civilizationId))
    return this.store.getCivilization(worldId, civilizationId) ?? updated
  }

  reconcilePopulation(worldId: string, regionId?: string): PopulationAggregate {
    requireWorldId(worldId)
    if (regionId !== undefined) return this.getRegionPopulation(worldId, regionId)
    return this.getPopulation(worldId)
  }

  listNpcPlaceholders(worldId: string, civilizationId: string): NpcPlaceholderSlot[] {
    requireWorldId(worldId)
    return this.store.listSlots(worldId, civilizationId).map(copySlot)
  }

  listUnassignedNpcPlaceholders(
    worldId: string,
    filter: ListUnassignedFilter = {}
  ): NpcPlaceholderSlot[] {
    requireWorldId(worldId)
    return this.store
      .listSlots(worldId)
      .filter((slot) => slot.status === 'unassigned')
      .filter((slot) => matchesUnassignedFilter(slot, filter))
      .map(copySlot)
  }

  claimNpcPlaceholder(worldId: string, slotId: string, npcId: string): NpcPlaceholderSlot {
    requireWorldId(worldId)
    const slot = this.store.getSlot(worldId, slotId)
    if (!slot) throw new Error(`NPC placeholder not found: ${slotId}`)
    const claimed = applyClaim(slot, npcId)
    this.store.upsertSlot(claimed)
    this.bumpAssigned(worldId, claimed.civilizationId, 1)
    return copySlot(claimed)
  }

  releaseNpcPlaceholder(worldId: string, slotId: string): NpcPlaceholderSlot {
    requireWorldId(worldId)
    const slot = this.store.getSlot(worldId, slotId)
    if (!slot) throw new Error(`NPC placeholder not found: ${slotId}`)
    const wasAssigned = slot.status === 'assigned'
    const released = applyRelease(slot)
    this.store.upsertSlot(released)
    if (wasAssigned) this.bumpAssigned(worldId, released.civilizationId, -1)
    return copySlot(released)
  }

  ensureNpcPlaceholders(
    worldId: string,
    civilizationId: string,
    input?: Partial<EnsureNpcPlaceholdersInput>
  ): NpcPlaceholderSlot[] {
    requireWorldId(worldId)
    const record = this.store.getCivilization(worldId, civilizationId)
    if (!record) throw new Error(`Civilization not found: ${civilizationId}`)
    const args = {
      store: this.store,
      regional: this.regional,
      record
    }
    return input?.roleHints === undefined
      ? ensureSlotsForRecord(args)
      : ensureSlotsForRecord({ ...args, roleHints: input.roleHints })
  }

  getCivilization(worldId: string, civilizationId: string): CivilizationRecord | null {
    requireWorldId(worldId)
    return this.store.getCivilization(worldId, civilizationId)
  }

  listCivilizations(worldId: string): CivilizationRecord[] {
    requireWorldId(worldId)
    return this.store.listCivilizations(worldId)
  }

  listCivilizationsInRegion(worldId: string, regionId: string): CivilizationRecord[] {
    requireWorldId(worldId)
    return this.store.listInRegion(worldId, regionId)
  }

  getCivilizationAt(worldId: string, x: number, y: number): CivilizationRecord | null {
    requireWorldId(worldId)
    return this.store.getAt(worldId, x, y)
  }

  getCivilizationsInBounds(
    worldId: string,
    query: { x: number; y: number; length: number; width: number }
  ): CivilizationRecord[] {
    requireWorldId(worldId)
    return this.store.listInBounds(worldId, {
      minX: query.x,
      minY: query.y,
      maxX: query.x + query.length - 1,
      maxY: query.y + query.width - 1
    })
  }

  getCivilizationSummary(worldId: string, civilizationId: string): CivilizationSummary | null {
    const record = this.getCivilization(worldId, civilizationId)
    return record ? toSummary(record) : null
  }

  getRegionCivilizationSummary(
    worldId: string,
    regionId: string
  ): RegionCivilizationSummary | null {
    requireWorldId(worldId)
    if (!this.regional.getRegion(worldId, regionId)) return null
    const settlements = this.store.listInRegion(worldId, regionId).map(toSummary)
    return {
      worldId,
      regionId,
      population: settlements.reduce((sum, s) => sum + s.population, 0),
      settlementCount: settlements.length,
      settlements
    }
  }

  hasCivilizations(worldId: string): boolean {
    return this.countCivilizations(worldId) > 0
  }

  countCivilizations(worldId: string): number {
    requireWorldId(worldId)
    return this.store.countCivilizations(worldId)
  }

  deleteCivilization(worldId: string, civilizationId: string): void {
    requireWorldId(worldId)
    this.overlays.deleteOverlaysForCivilization(worldId, civilizationId)
    this.store.deleteCivilization(worldId, civilizationId)
  }

  clearCivilizations(worldId: string, regionId?: string): void {
    requireWorldId(worldId)
    const records =
      regionId === undefined
        ? this.store.listCivilizations(worldId)
        : this.store.listInRegion(worldId, regionId)
    for (const record of records) {
      this.overlays.deleteOverlaysForCivilization(worldId, record.civilizationId)
    }
    this.store.clearCivilizations(worldId, regionId)
  }

  updateSettlementNaming(
    worldId: string,
    civilizationId: string,
    naming: { displayName: string; history: string; namingRealizedAt: string }
  ): CivilizationRecord {
    requireWorldId(worldId)
    const existing = this.store.getCivilization(worldId, civilizationId)
    if (existing === null) {
      throw new Error(`Civilization not found: ${civilizationId}`)
    }
    const updated: CivilizationRecord = {
      ...existing,
      displayName: naming.displayName,
      history: naming.history,
      namingRealizedAt: naming.namingRealizedAt,
      updatedAt: nowIso()
    }
    this.store.saveCivilization(updated, this.cellsForCivilization(worldId, civilizationId))
    return this.store.getCivilization(worldId, civilizationId) ?? updated
  }

  private cellsForCivilization(worldId: string, civilizationId: string) {
    return this.store.listClaimedCells(worldId).filter((cell) => {
      return this.store.getAt(worldId, cell.x, cell.y)?.civilizationId === civilizationId
    })
  }

  private bumpAssigned(worldId: string, civilizationId: string, delta: number): void {
    const record = this.store.getCivilization(worldId, civilizationId)
    if (!record) return
    const npcSlotsAssigned = Math.max(0, record.npcSlotsAssigned + delta)
    this.store.saveCivilization(
      { ...record, npcSlotsAssigned, updatedAt: nowIso() },
      this.cellsForCivilization(worldId, civilizationId)
    )
  }
}

export function createCivilizationService(options: CivilizationServiceOptions): CivilizationService {
  return new DefaultCivilizationService(options)
}

function settlementStatus(
  current: CivilizationRecord['mutationStatus'] | undefined,
  mutation: SettlementMutation
): NonNullable<CivilizationRecord['mutationStatus']> {
  if (mutation.kind === 'burned') return current === 'destroyed' ? 'destroyed' : 'burned'
  if (mutation.kind === 'destroyed') return 'destroyed'
  return current ?? 'intact'
}

function settlementPopulation(current: number, mutation: SettlementMutation): number {
  if (mutation.population !== undefined) {
    return applyPopulationChange(current, mutation.population)
  }
  return mutation.kind === 'destroyed' ? 0 : current
}
