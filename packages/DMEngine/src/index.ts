
import type { CharacterEngineApi } from '@weaver/character-engine'
import type { CombatEngineApi } from '@weaver/combat-engine'
import type { WorldEngineApi } from '@weaver/world-engine'
import type { NarrationEngineApi } from '@weaver/narration-engine'
import type { ItemEngineApi } from '@weaver/item-engine'
import type { NpcEngineApi } from '@weaver/npc-engine'
import type { EnemyEngineApi } from '@weaver/enemy-engine'
import {
  createCampaign,
  openCampaign,
  type CampaignHandle,
  type CampaignOpenOptions
} from './persistence/campaignPersistence.js'

export {
  CURRENT_CAMPAIGN_SCHEMA_VERSION,
  CampaignAlreadyExistsError,
  CampaignIdentityError,
  CampaignNotFoundError,
  UnknownCampaignSchemaVersionError,
  createCampaign,
  openCampaign
} from './persistence/campaignPersistence.js'

export type {
  CampaignHandle,
  CampaignOpenOptions,
  CatalogSeedContext,
  CatalogSeedEntry,
  CatalogSeedHook,
  CatalogSeedWriter
} from './persistence/campaignPersistence.js'

export { DmIntentError } from './intents/errors.js'
export { classifyPlayerIntent } from './intents/classifyIntent.js'
export { resolveBuyIntent, resolveSellIntent } from './intents/commerceHandler.js'
export { resolveTravelIntent } from './intents/travelHandler.js'
export { resolvePlayerIntent } from './intents/resolvePlayerIntent.js'
export type { ResolvePlayerIntentInput } from './intents/resolvePlayerIntent.js'
export type {
  BuyIntentRequest,
  CharacterTravelApi,
  CommerceSuccess,
  ItemCurrencyApi,
  NarrationIntentResult,
  PlayerIntentKind,
  ResolvedPlayerIntent,
  SellIntentRequest,
  TravelDestinationLookup,
  TravelIntentRequest,
  TravelSuccess
} from './intents/types.js'

export { DmQuestError } from './quests/errors.js'
export { DmNamingError } from './naming/errors.js'
export {
  realizeCampaignPantheon,
  realizeRegionName,
  realizeSettlementName,
  regenerateRegionName,
  persistValidatedRegionNaming,
  persistValidatedSettlementNaming,
  assertValidatedPlaceNaming,
  toValidatedPlaceNaming
} from './naming/worldNamingOrchestration.js'
export type {
  CivilizationNamingApi,
  NarrationWorldNamingApi,
  RealizeCampaignPantheonInput,
  RealizeRegionNameInput,
  RealizeSettlementNameDeps,
  RealizeSettlementNameInput,
  RegionalNamingApi,
  ValidatedPlaceNaming
} from './naming/worldNamingOrchestration.js'
export {
  completeQuest,
  failQuest,
  proposeQuest,
  updateQuestProgress
} from './quests/questOrchestration.js'
export type {
  CharacterQuestApi,
  QuestProgressInput,
  QuestProposalInput,
  QuestReferenceLookup,
  QuestTransitionInput
} from './quests/types.js'

// Guided character-creation orchestration (epic 061).
export {
  buildCharacterFacts,
  confirmOpeningScene,
  exportGuidedCreationStates,
  generateOpeningScene,
  getGuidedCreationState,
  importGuidedCreationStates,
  resetGuidedCreationStateStore,
  startGuidedIdentity,
  submitGuidedIdentityMessage
} from './guidedCreation/index.js'
export type {
  CharacterIdentityGroundingApi,
  CharacterIdentitySelection,
  CharacterStartingLoadoutFact,
  CompanionFact,
  ConfirmOpeningSceneInput,
  GenerateOpeningSceneInput,
  GuidedCreationNarrationApi,
  GuidedCreationPhase,
  GuidedCreationState,
  GuidedCreationTranscriptEntry,
  GuidedIdentitySubmitResult,
  GuidedTranscriptSpeaker,
  IdentityCreationPhase,
  OpeningSceneResult,
  StartGuidedIdentityInput,
  SubmitGuidedIdentityInput
} from './guidedCreation/index.js'

export { runCampaignGeneration } from './campaignGen/pipeline.js'
export { CAMPAIGN_GENERATION_STAGES } from './campaignGen/types.js'
export type {
  CampaignGenerationDeps,
  CampaignGenerationInput,
  CampaignGenerationResult,
  CampaignGenerationStageId,
  StageOutput
} from './campaignGen/types.js'

export {
  emitWorldMutation
} from './worldMutations/index.js'
export type {
  NpcWorldMutationRequest,
  RegionWorldMutation,
  SettlementWorldMutation,
  WorldMutation,
  WorldMutationDeps,
  WorldMutationResult
} from './worldMutations/index.js'

export {
  clearPlaceProposalRegistry,
  resolvePlaceProposal
} from './playPopulation/index.js'
export type {
  LivePopulationDeps,
  PlaceProposal,
  ResolvedPlaceProposal
} from './playPopulation/index.js'

// Turn routing (epic 053).
export {
  TurnRoutingError,
  buildTurnNarrationPrompt,
  heuristicRoute,
  interpretIntentAndRoute,
  lockTurn,
  narrateTurnOutcome,
  resolveCombatBranch,
  resolveCommerceBranch,
  resolveNarrationBranch,
  resolveTravelBranch,
  resolveTurn
} from './turnRouting/index.js'
export type {
  BranchResolution,
  CombatBranchResolution,
  CombatTurnApi,
  InterpretIntentInput,
  ResolveTurnDeps,
  ResolveTurnInput,
  ResolveTurnResult,
  RoutePlan,
  RoutedIntent,
  RoutedIntentKind,
  TurnChannel,
  TurnNarrationOutcome,
  TurnPersistRecord,
  TurnProjections,
  TurnRoute,
  TurnRoutingErrorCode
} from './turnRouting/index.js'

// Ask-the-DM OOC (epic 057).
export {
  appendAskDmEntry,
  askTheDm,
  assembleAskDmContext,
  exportAskDmHistory,
  getAskDmHistory,
  importAskDmHistory,
  resetAskDmHistoryStore
} from './askDm/index.js'
export type {
  AskDmContextInput,
  AskDmHistory,
  AskDmHistoryEntry,
  AskDmNarrationApi,
  AskDmSpeaker,
  AskTheDmInput,
  AskTheDmResult
} from './askDm/index.js'

// Shared time & hub recap (epic 058).
export {
  appendCausalEvent,
  buildSessionRecap,
  compareCausalOrder,
  exportCausalTimelineStore,
  exportCharacterSessionCursorStore,
  getCharacterSessionCursor,
  getSharedCampaignDay,
  importCausalTimelineStore,
  importCharacterSessionCursorStore,
  listCausalEvents,
  listEventsSince,
  recordCharacterSessionCursor,
  resetCausalTimelineStore,
  resetCharacterSessionCursorStore,
  sortEventsByCausalOrder
} from './sharedTime/index.js'
export type {
  AppendCausalEventInput,
  CausalEvent,
  CharacterDayCounterApi,
  CharacterSessionCursor,
  SessionRecap,
  SessionRecapInput
} from './sharedTime/index.js'

// Campaign portability (epic 059).
export {
  PORTABLE_PACKAGE_VERSION,
  PortabilitySchemaError,
  createDefaultCampaignImportDeps,
  createDefaultCampaignPortabilityDeps,
  exportCampaignPackage,
  importCampaignPackage
} from './portability/index.js'
export type {
  CampaignImportDeps,
  CampaignPortabilityContext,
  CampaignPortabilityDeps,
  CampaignPortablePackage,
  ExportCampaignPackageInput,
  ImportCampaignPackageInput
} from './portability/index.js'

// Context efficiency & RAG (epic 062).
export {
  ContextBudgetExceededError,
  TRUNCATION_MARKER,
  assembleAgentContext,
  buildCombatNarrationPrompt,
  buildLootNarrationPrompt,
  buildXpNarrationPrompt,
  estimateTokens,
  formatAlwaysOnGrounding,
  truncateToTokenBudget,
  windowGuidedTranscript
} from './context/index.js'
export type {
  AlwaysOnGrounding,
  AssembleAgentContextInput,
  AssembleAgentContextResult,
  CombatNarrationSlots,
  LootNarrationSlots,
  RagContextChunk,
  XpNarrationSlots
} from './context/index.js'

export type DmEngineDeps = {
  combat: CombatEngineApi
  world: WorldEngineApi
  narration: NarrationEngineApi
  items: ItemEngineApi
  npcs: NpcEngineApi
  enemies: EnemyEngineApi
  characters: CharacterEngineApi
}
export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type DmEngineApi = {
  id: 'DMEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  createCampaign: (options: CampaignOpenOptions) => CampaignHandle
  openCampaign: (options: CampaignOpenOptions) => CampaignHandle
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

type CampaignEndpointResult = Omit<CampaignHandle, 'close'>

const PACKAGE_NAME = '@weaver/dm-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'describeRole',
      description: 'Describe how the DM engine should use peer engines via API calls',
      invoke: () => ({
        invents: false,
        pullsFrom: [
          'character-engine',
          'combat-engine',
          'world-engine',
          'narration-engine',
          'item-engine',
          'npc-engine',
          'enemy-engine'
        ],
        note: 'DMEngine orchestrates; it does not invent world or combat facts itself.'
      })
    },
    {
      name: 'campaign.create',
      description: 'Create and migrate a campaign store through the DM engine boundary',
      invoke: (payload) => summarizeAndClose(createCampaign(readCampaignPayload(payload)))
    },
    {
      name: 'campaign.open',
      description: 'Open and migrate a campaign store through the DM engine boundary',
      invoke: (payload) => summarizeAndClose(openCampaign(readCampaignPayload(payload)))
    }
  ]
}

export const dmEngine: DmEngineApi = {
  id: 'DMEngine',
  title: 'DM Engine',
  description: 'LLM story control via API calls into other engines',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  createCampaign(options: CampaignOpenOptions) {
    return createCampaign(options)
  },
  openCampaign(options: CampaignOpenOptions) {
    return openCampaign(options)
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((e) => e.name === endpoint)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}

function summarizeAndClose(handle: CampaignHandle): CampaignEndpointResult {
  try {
    return {
      campaignId: handle.campaignId,
      filePath: handle.filePath,
      schemaVersion: handle.schemaVersion,
      appliedMigrations: handle.appliedMigrations
    }
  } finally {
    handle.close()
  }
}

function readCampaignPayload(payload?: unknown): CampaignOpenOptions {
  if (!isRecord(payload)) {
    throw new Error('Campaign endpoint payload must be an object')
  }
  const campaignId = payload.campaignId
  const filePath = payload.filePath
  if (typeof campaignId !== 'string' || campaignId.length === 0) {
    throw new Error('Campaign endpoint payload requires campaignId')
  }
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new Error('Campaign endpoint payload requires filePath')
  }
  return { campaignId, filePath }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
