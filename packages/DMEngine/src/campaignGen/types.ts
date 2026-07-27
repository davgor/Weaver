import type {
  FillAndValidateInput,
  FillAndValidateResult,
  TextCompleter
} from '@weaver/narration-engine'
import type {
  Aabb,
  Cell,
  CreateWorldOptions,
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
import type {
  AddNpcToFactionInput,
  ConstructNpcInput,
  CreateFactionInput,
  FactionRecord,
  NpcRecord
} from '@weaver/npc-engine'
import type {
  BestiaryEntry,
  GenerateEncounterFoesInput,
  GeneratedFoeRef
} from '@weaver/enemy-engine'
import type {
  SeedWorldQuestsInput,
  WorldQuest
} from '@weaver/quest-engine'
import type {
  CampaignHandle,
  CampaignOpenOptions,
  CatalogSeedEntry
} from '../persistence/campaignPersistence.js'

export const CAMPAIGN_GENERATION_STAGES = [
  'canon',
  'pantheon',
  'world',
  'factions',
  'regions',
  'npcs',
  'bestiary',
  'story',
  'persist'
] as const

export type CampaignGenerationStageId = (typeof CAMPAIGN_GENERATION_STAGES)[number]

export type CampaignGenerationInput = {
  campaignId: string
  dataRoot: string
  campaignFilePath: string
  regionCount: number
  npcsPerRegion: number
  seed?: string
  premise?: string
  maxSeedRetries?: number
  maxStageRetries?: number
}

type FilledStage = Omit<FillAndValidateInput, 'stage'> & {
  stage: CampaignGenerationStageId
}

export type StageOutput = {
  stage: CampaignGenerationStageId
  filled: Record<string, string>
  filledText: string
}

export type CampaignGenerationResult = {
  campaignId: string
  seed: string
  worldId: string
  stages: StageOutput[]
  canon: string
  pantheon: string
  worldSummary: string
  factions: FactionRecord[]
  regions: RegionRecord[]
  civilizations: CivilizationRecord[]
  npcs: NpcRecord[]
  foes: GeneratedFoeRef[]
  bestiaryFlavor: string
  storyPremise: string
  quests: WorldQuest[]
  campaign: Omit<CampaignHandle, 'close' | 'getDb'>
  catalogEntries: CatalogSeedEntry[]
}

export type WorldReader = {
  getWorldMeta: (worldId: string) => WorldMeta
  getWorldBounds: (worldId: string) => Aabb
  getExpansion: (worldId: string, expansionId: string) => ExpansionRecord | null
  getCell: (args: { worldId: string; x: number; y: number }) => Cell | null
  getWorldSpecific: (args: { worldId: string; bounds: Aabb }) => Cell[]
}

export type RegionalReader = {
  getRegion: (worldId: string, regionId: string) => RegionRecord | null
  getRegionSummary: (worldId: string, regionId: string) => RegionSummary | null
  getRegionCells: (worldId: string, regionId: string) => { x: number; y: number }[]
  listRegions: (worldId: string) => RegionRecord[]
  getRegionsInBounds: (worldId: string, bounds: Aabb) => RegionRecord[]
}

export type CampaignGenerationDeps = {
  narration: {
    fillAndValidate: (
      input: FilledStage,
      completer: TextCompleter
    ) => Promise<FillAndValidateResult>
  }
  completer: TextCompleter
  world: {
    createWorld: (
      dataRoot: string,
      opts?: CreateWorldOptions
    ) => { meta: WorldMeta; expansion0: ExpansionRecord }
    getWorldMeta: (dataRoot: string, worldId: string) => WorldMeta
    getWorldBounds: (dataRoot: string, worldId: string) => Aabb
    getExpansion: (dataRoot: string, worldId: string, expansionId: string) => ExpansionRecord | null
    getCell: (args: { dataRoot: string; worldId: string; x: number; y: number }) => Cell | null
    getWorldSpecific: (args: { dataRoot: string; worldId: string; bounds: Aabb }) => Cell[]
  }
  regional: {
    fillRegions: (
      options: RegionalServiceOptions,
      worldId: string,
      scope?: { expansionId?: string; bounds?: Aabb }
    ) => RegionRecord[]
    getRegion: (
      options: RegionalServiceOptions,
      worldId: string,
      regionId: string
    ) => RegionRecord | null
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
    listRegions: (options: RegionalServiceOptions, worldId: string) => RegionRecord[]
    getRegionsInBounds: (
      options: RegionalServiceOptions,
      worldId: string,
      bounds: Aabb
    ) => RegionRecord[]
  }
  civilization: {
    fillCivilizations: (
      options: CivilizationServiceOptions,
      worldId: string,
      scope?: FillCivilizationsScope
    ) => CivilizationRecord[]
    ensureNpcPlaceholders: (input: EnsureNpcPlaceholdersInput) => NpcPlaceholderSlot[]
  }
  npc: {
    constructNpc: (input: ConstructNpcInput) => NpcRecord
    createFaction: (input: CreateFactionInput) => FactionRecord
    addNpcToFaction: (input: AddNpcToFactionInput) => FactionRecord
  }
  enemy: {
    listBestiary: () => BestiaryEntry[]
    generateEncounterFoes: (input?: GenerateEncounterFoesInput) => GeneratedFoeRef[]
  }
  campaign: {
    createCampaign: (options: CampaignOpenOptions) => CampaignHandle
  }
  quest: {
    seedWorldQuests: (input: SeedWorldQuestsInput) => WorldQuest[]
    listSeedItemIds: () => readonly string[]
  }
}

export type GenerationState = {
  input: CampaignGenerationInput
  seed: string
  worldId: string
  stages: StageOutput[]
  canon?: string
  pantheon?: string
  worldSummary?: string
  factions: FactionRecord[]
  regions: RegionRecord[]
  civilizations: CivilizationRecord[]
  placeholders: NpcPlaceholderSlot[]
  npcs: NpcRecord[]
  foes: GeneratedFoeRef[]
  bestiaryFlavor?: string
  storyPremise?: string
  quests: WorldQuest[]
  campaign?: Omit<CampaignHandle, 'close' | 'getDb'>
  catalogEntries: CatalogSeedEntry[]
}
