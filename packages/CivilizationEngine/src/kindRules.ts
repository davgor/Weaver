import type { RegionSummary } from '@weaver/regional-engine'
import type { SettlementKind } from './types.js'
import type { NpcRoleHint } from './npcPlaceholders.js'

export type KindCapacity = {
  kind: SettlementKind
  eligible: boolean
  minPopulation: number
  maxPopulation: number
  maxFootprintCells: number
  roleHints: readonly NpcRoleHint[]
  slotsPerPopulation: number
}

const ROLE_BY_KIND: Record<SettlementKind, readonly NpcRoleHint[]> = {
  farmHouse: ['farmer', 'resident'],
  hamlet: ['resident', 'farmer'],
  village: ['resident', 'merchant', 'mayor'],
  castle: ['guard', 'lord', 'resident'],
  city: ['resident', 'merchant', 'guard', 'mayor']
}

type BandInput = {
  kind: SettlementKind
  eligible: boolean
  minPopulation: number
  maxPopulation: number
  maxFootprintCells: number
  slotsPerPopulation: number
}

function landCellEstimate(summary: RegionSummary): number {
  return Math.max(0, Math.round(summary.cellCount * (1 - summary.waterContent)))
}

function band(input: BandInput): KindCapacity {
  return {
    kind: input.kind,
    eligible: input.eligible,
    minPopulation: input.minPopulation,
    maxPopulation: input.maxPopulation,
    maxFootprintCells: input.maxFootprintCells,
    roleHints: ROLE_BY_KIND[input.kind],
    slotsPerPopulation: input.slotsPerPopulation
  }
}

function emptyLadder(): KindCapacity[] {
  return (['farmHouse', 'hamlet', 'village', 'castle', 'city'] as SettlementKind[]).map((kind) =>
    band({
      kind,
      eligible: false,
      minPopulation: 0,
      maxPopulation: 0,
      maxFootprintCells: 0,
      slotsPerPopulation: 1
    })
  )
}

export function evaluateKindRules(summary: RegionSummary): KindCapacity[] {
  if (summary.isOcean || summary.cellCount === 0) return emptyLadder()
  const land = landCellEstimate(summary)
  return [
    band({
      kind: 'farmHouse',
      eligible: land >= 1,
      minPopulation: 2,
      maxPopulation: 8,
      maxFootprintCells: Math.min(3, land),
      slotsPerPopulation: 2
    }),
    band({
      kind: 'hamlet',
      eligible: land >= 8,
      minPopulation: 10,
      maxPopulation: 40,
      maxFootprintCells: Math.min(9, land),
      slotsPerPopulation: 4
    }),
    band({
      kind: 'village',
      eligible: land >= 20,
      minPopulation: 50,
      maxPopulation: 200,
      maxFootprintCells: Math.min(25, land),
      slotsPerPopulation: 5
    }),
    band({
      kind: 'castle',
      eligible: land >= 12 && summary.averageElevation >= 0.45,
      minPopulation: 20,
      maxPopulation: 100,
      maxFootprintCells: Math.min(16, land),
      slotsPerPopulation: 3
    }),
    band({
      kind: 'city',
      eligible: land >= 40 && !summary.isLandlocked,
      minPopulation: 200,
      maxPopulation: 5000,
      maxFootprintCells: Math.min(120, land),
      slotsPerPopulation: 8
    })
  ]
}

export function eligibleKinds(summary: RegionSummary): SettlementKind[] {
  return evaluateKindRules(summary)
    .filter((rule) => rule.eligible)
    .map((rule) => rule.kind)
}

export function capacityForKind(summary: RegionSummary, kind: SettlementKind): KindCapacity {
  const match = evaluateKindRules(summary).find((rule) => rule.kind === kind)
  if (!match) throw new Error(`Unknown settlement kind: ${kind}`)
  return match
}

export function clampPopulation(capacity: KindCapacity, raw: number): number {
  if (!capacity.eligible) return 0
  return Math.max(capacity.minPopulation, Math.min(capacity.maxPopulation, Math.round(raw)))
}

export function slotTargetForPopulation(capacity: KindCapacity, population: number): number {
  if (population <= 0 || !capacity.eligible) return 0
  const fromPop = Math.max(1, Math.ceil(population / capacity.slotsPerPopulation))
  return Math.min(fromPop, capacity.roleHints.length * 4)
}
