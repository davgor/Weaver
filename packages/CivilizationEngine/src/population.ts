import type { CivilizationRecord, PopulationAggregate, PopulationByKind, SettlementKind } from './types.js'

export function emptyAggregate(worldId: string, regionId?: string): PopulationAggregate {
  const aggregate: PopulationAggregate = { worldId, population: 0, byKind: {} }
  if (regionId !== undefined) aggregate.regionId = regionId
  return aggregate
}

export function aggregateFromRecords(
  worldId: string,
  records: readonly CivilizationRecord[],
  regionId?: string
): PopulationAggregate {
  const byKind: PopulationByKind = {}
  let population = 0
  for (const record of records) {
    population += record.population
    const kind = record.kind as SettlementKind
    byKind[kind] = (byKind[kind] ?? 0) + record.population
  }
  return regionId === undefined
    ? { worldId, population, byKind }
    : { worldId, regionId, population, byKind }
}

export function applyPopulationChange(
  current: number,
  change: { delta: number } | { absolute: number }
): number {
  if ('absolute' in change) return Math.max(0, Math.round(change.absolute))
  return Math.max(0, Math.round(current + change.delta))
}
