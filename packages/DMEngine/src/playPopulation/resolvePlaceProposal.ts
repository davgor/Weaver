import type { NpcRoleHint } from '@weaver/civilization-engine'
import type {
  BoundWorldReader,
  LivePopulationDeps,
  LivePopulationRegionalApi,
  PlaceProposal,
  ResolvedPlaceProposal
} from './types.js'

const resolvedProposals = new Map<string, ResolvedPlaceProposal>()

export function clearPlaceProposalRegistry(): void {
  resolvedProposals.clear()
}

export function resolvePlaceProposal(
  proposal: PlaceProposal,
  deps: LivePopulationDeps
): ResolvedPlaceProposal {
  const key = requireProposalKey(proposal.proposalKey)
  const existing = resolvedProposals.get(key)
  if (existing !== undefined) return copyResolved(existing)

  const world = bindWorldReader(proposal.dataRoot, deps)
  const regionalOptions = { dataRoot: proposal.dataRoot, world }
  const region = firstCreatedRegion(proposal, deps, regionalOptions)
  const civilization = firstCreatedSettlement(proposal, deps, regionalOptions, region.regionId)
  const npcIds = constructNpcs(proposal, deps, civilization.civilizationId, region.regionId)
  const lootPlaceId = seedLoot(proposal, deps, civilization.civilizationId)
  const resolved = copyResolved({
    proposalKey: key,
    worldId: proposal.worldId,
    campaignId: proposal.campaignId,
    regionId: region.regionId,
    civilizationId: civilization.civilizationId,
    npcIds,
    ...(lootPlaceId === undefined ? {} : { lootPlaceId })
  })
  resolvedProposals.set(key, resolved)
  return copyResolved(resolved)
}

export function bindWorldReader(dataRoot: string, deps: Pick<LivePopulationDeps, 'world'>): BoundWorldReader {
  return {
    getWorldMeta: (worldId) => deps.world.getWorldMeta(dataRoot, worldId),
    getWorldBounds: (worldId) => deps.world.getWorldBounds(dataRoot, worldId),
    getExpansion: (worldId, expansionId) => deps.world.getExpansion(dataRoot, worldId, expansionId),
    getCell: (args) => deps.world.getCell({ ...args, dataRoot }),
    getWorldSpecific: (args) => deps.world.getWorldSpecific({ ...args, dataRoot })
  }
}

function firstCreatedRegion(
  proposal: PlaceProposal,
  deps: LivePopulationDeps,
  regionalOptions: { dataRoot: string; world: BoundWorldReader }
) {
  const created = deps.regional.fillRegions(regionalOptions, proposal.worldId, proposal.scope)
  const region = created[0] ?? deps.regional.listRegions(regionalOptions, proposal.worldId)[0]
  if (region === undefined) throw new Error('Unable to resolve a generated region for place proposal')
  return region
}

function firstCreatedSettlement(
  proposal: PlaceProposal,
  deps: LivePopulationDeps,
  regionalOptions: { dataRoot: string; world: BoundWorldReader },
  regionId: string
) {
  const regional = bindRegionalReader(regionalOptions, deps.regional)
  const options = { ...regionalOptions, regional }
  const created = deps.civilization.fillCivilizations(options, proposal.worldId, { regionIds: [regionId] })
  const settlement = created[0] ?? deps.civilization.listCivilizationsInRegion(
    options,
    proposal.worldId,
    regionId
  )[0]
  if (settlement === undefined) throw new Error('Unable to resolve a generated settlement for place proposal')
  return settlement
}

function bindRegionalReader(
  options: { dataRoot: string; world: BoundWorldReader },
  regional: LivePopulationRegionalApi
) {
  return {
    getRegion: (worldId: string, regionId: string) => regional.getRegion(options, worldId, regionId),
    getRegionSummary: (worldId: string, regionId: string) =>
      regional.getRegionSummary(options, worldId, regionId),
    getRegionCells: (worldId: string, regionId: string) =>
      regional.getRegionCells(options, worldId, regionId),
    listRegions: (worldId: string) => regional.listRegions(options, worldId),
    getRegionsInBounds: (worldId: string, bounds: Parameters<LivePopulationRegionalApi['getRegionsInBounds']>[2]) =>
      regional.getRegionsInBounds(options, worldId, bounds)
  }
}

function constructNpcs(
  proposal: PlaceProposal,
  deps: LivePopulationDeps,
  civilizationId: string,
  regionId: string
): string[] {
  const count = Math.max(0, Math.floor(proposal.npcsToMint ?? 0))
  if (count === 0) return []
  const slots = deps.civilization.ensureNpcPlaceholders({
    worldId: proposal.worldId,
    civilizationId,
    regionId,
    roleHints: roleHints(count)
  })
  return slots.slice(0, count).map((slot, index) => deps.npc.constructNpc({
    campaignId: proposal.campaignId,
    worldId: proposal.worldId,
    npcId: `${requireProposalKey(proposal.proposalKey)}.npc.${index + 1}`,
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'neutral',
    temperament: 'steady',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
  }).npcId)
}

function seedLoot(
  proposal: PlaceProposal,
  deps: LivePopulationDeps,
  placeId: string
): string | undefined {
  if (proposal.lootSeed === undefined || deps.item === undefined) return undefined
  const drops = deps.item.generateLoot({ seed: proposal.lootSeed })
  deps.item.seedPlaceLoot(placeId, drops)
  return placeId
}

function roleHints(count: number): NpcRoleHint[] {
  return Array.from({ length: count }, () => 'resident' as const)
}

function requireProposalKey(proposalKey: string): string {
  const key = proposalKey.trim()
  if (!key) throw new Error('placeProposal proposalKey required')
  return key.replaceAll(/[^a-zA-Z0-9._-]/g, '-')
}

function copyResolved(resolved: ResolvedPlaceProposal): ResolvedPlaceProposal {
  return { ...resolved, npcIds: [...resolved.npcIds] }
}
