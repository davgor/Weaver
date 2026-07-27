import type {
  FillAndValidateInput,
  FillAndValidateResult,
  TextCompleter
} from '@weaver/narration-engine'
import type {
  EnsureNpcPlaceholdersInput,
  NpcPlaceholderSlot
} from '@weaver/civilization-engine'
import type {
  ConstructNpcInput,
  GroundingContext,
  NpcMemory,
  NpcRecord,
  QueryNpcGroundingContextInput
} from '@weaver/npc-engine'
import type {
  CampaignHandle,
  CampaignOpenOptions,
  CatalogSeedEntry
} from '../persistence/campaignPersistence.js'

/** Minimum configurable act count for a VN short story. */
export const VN_STORY_ACT_COUNT_MIN = 1
/** Maximum configurable act count for a VN short story. */
export const VN_STORY_ACT_COUNT_MAX = 7
/** Default act count when the brief omits `actCount`. */
export const VN_STORY_ACT_COUNT_DEFAULT = 3

export const VN_STORY_GENERATION_STAGES = [
  'premise',
  'acts',
  'cast',
  'opening',
  'overview',
  'persist'
] as const

export type VnStoryGenerationStageId = (typeof VN_STORY_GENERATION_STAGES)[number]

export type VnMainCharacterBrief = {
  name: string
  personality: string
  appearance: string
}

export type VnStoryBrief = {
  premise: string
  mainCharacter: VnMainCharacterBrief
  /** Default 3; integer in [VN_STORY_ACT_COUNT_MIN, VN_STORY_ACT_COUNT_MAX]. */
  actCount?: number
}

export type VnStoryGenerationInput = VnStoryBrief & {
  campaignId: string
  dataRoot: string
  campaignFilePath: string
  seed?: string
  maxSeedRetries?: number
  maxStageRetries?: number
}

export type VnStoryActOverview = {
  actIndex: number
  title: string
  summary: string
}

export type VnStoryCastMember = {
  npcId: string
  displayName: string
  role: string
}

export type VnStoryOverview = {
  campaignId: string
  premiseSummary: string
  mainCharacter: VnMainCharacterBrief
  acts: VnStoryActOverview[]
  cast: VnStoryCastMember[]
  openingBeat: string
  overviewProse: string
}

export type VnStageOutput = {
  stage: VnStoryGenerationStageId
  filled: Record<string, string>
  filledText: string
}

export type VnStoryGenerationResult = {
  campaignId: string
  seed: string
  lifecycle: 'draft'
  stages: VnStageOutput[]
  overview: VnStoryOverview
  npcIds: string[]
  campaign: Omit<CampaignHandle, 'close' | 'getDb'>
}

type FilledStage = Omit<FillAndValidateInput, 'stage'> & {
  stage: VnStoryGenerationStageId
}

export type VnStoryGenerationDeps = {
  narration: {
    fillAndValidate: (
      input: FilledStage,
      completer: TextCompleter
    ) => Promise<FillAndValidateResult>
  }
  completer: TextCompleter
  civilization: {
    ensureNpcPlaceholders: (input: EnsureNpcPlaceholdersInput) => NpcPlaceholderSlot[]
  }
  npc: {
    constructNpc: (input: ConstructNpcInput) => NpcRecord
    appendNpcMemory: (memory: NpcMemory) => NpcMemory
    queryNpcGroundingContext: (input: QueryNpcGroundingContextInput) => GroundingContext
  }
  character: {
    setCampaignRaceRoster: (
      campaignId: string,
      races: ReadonlyArray<{ raceId: string; name: string }>
    ) => void
  }
  campaign: {
    createCampaign: (options: CampaignOpenOptions) => CampaignHandle
  }
}

export type VnGenerationState = {
  input: VnStoryGenerationInput
  actCount: number
  seed: string
  /** Synthetic ids — VN cast does not require a full WorldEngine world. */
  worldId: string
  civilizationId: string
  regionId: string
  stages: VnStageOutput[]
  premiseSummary?: string
  acts: VnStoryActOverview[]
  placeholders: NpcPlaceholderSlot[]
  npcs: NpcRecord[]
  cast: VnStoryCastMember[]
  openingBeat?: string
  overviewProse?: string
  campaign?: Omit<CampaignHandle, 'close' | 'getDb'>
  catalogEntries: CatalogSeedEntry[]
}
