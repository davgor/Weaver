import type {
  Aabb,
  Cell,
  ExpansionRecord,
  WorldMeta
} from '@weaver/world-engine'
import type {
  RegionRecord,
  RegionalServiceOptions,
  RegionSummary
} from '@weaver/regional-engine'
import type {
  CivilizationRecord,
  CivilizationServiceOptions,
  FillCivilizationsScope,
  EnsureNpcPlaceholdersInput,
  NpcPlaceholderSlot
} from '@weaver/civilization-engine'
import type { ConstructNpcInput, NpcRecord } from '@weaver/npc-engine'
import type {
  GenerateLootRequest,
  LootDrop,
  PlaceInventorySnapshot
} from '@weaver/item-engine'

export type PlaceProposal = {
  proposalKey: string
  worldId: string
  campaignId: string
  dataRoot: string
  scope?: { expansionId?: string }
  npcsToMint?: number
  lootSeed?: string
}

export type ResolvedPlaceProposal = {
  proposalKey: string
  worldId: string
  campaignId: string
  regionId: string
  civilizationId: string
  npcIds: string[]
  lootPlaceId?: string
}

export type BoundWorldReader = {
  getWorldMeta: (worldId: string) => WorldMeta
  getWorldBounds: (worldId: string) => Aabb
  getExpansion: (worldId: string, expansionId: string) => ExpansionRecord | null
  getCell: (args: { worldId: string; x: number; y: number }) => Cell | null
  getWorldSpecific: (args: { worldId: string; bounds: Aabb }) => Cell[]
}

export type LivePopulationWorldApi = {
  getWorldMeta: (dataRoot: string, worldId: string) => WorldMeta
  getWorldBounds: (dataRoot: string, worldId: string) => Aabb
  getExpansion: (dataRoot: string, worldId: string, expansionId: string) => ExpansionRecord | null
  getCell: (args: { dataRoot: string; worldId: string; x: number; y: number }) => Cell | null
  getWorldSpecific: (args: { dataRoot: string; worldId: string; bounds: Aabb }) => Cell[]
}

export type LivePopulationRegionalApi = {
  fillRegions: (
    options: RegionalServiceOptions,
    worldId: string,
    scope?: { expansionId?: string }
  ) => RegionRecord[]
  listRegions: (options: RegionalServiceOptions, worldId: string) => RegionRecord[]
  getRegion: (options: RegionalServiceOptions, worldId: string, regionId: string) => RegionRecord | null
  getRegionSummary: (
    options: RegionalServiceOptions,
    worldId: string,
    regionId: string
  ) => RegionSummary | null
  getRegionCells: (
    options: RegionalServiceOptions,
    worldId: string,
    regionId: string
  ) => { x: number; y: number }[]
  getRegionsInBounds: (
    options: RegionalServiceOptions,
    worldId: string,
    bounds: Aabb
  ) => RegionRecord[]
}

export type LivePopulationCivilizationApi = {
  fillCivilizations: (
    options: CivilizationServiceOptions,
    worldId: string,
    scope?: FillCivilizationsScope
  ) => CivilizationRecord[]
  listCivilizationsInRegion: (
    options: CivilizationServiceOptions,
    worldId: string,
    regionId: string
  ) => CivilizationRecord[]
  ensureNpcPlaceholders: (input: EnsureNpcPlaceholdersInput) => NpcPlaceholderSlot[]
}

export type LivePopulationDeps = {
  world: LivePopulationWorldApi
  regional: LivePopulationRegionalApi
  civilization: LivePopulationCivilizationApi
  npc: { constructNpc: (input: ConstructNpcInput) => Pick<NpcRecord, 'npcId'> }
  item?: {
    generateLoot: (request: GenerateLootRequest) => LootDrop[]
    seedPlaceLoot: (placeId: string, drops: readonly LootDrop[]) => PlaceInventorySnapshot
  }
}
