export type { EngineEndpoint } from './typesApi.js'
export type {
  Aabb,
  Cell,
  CivilizationCandidate,
  CivilizationRecord,
  CivilizationRegionalReader,
  CivilizationServiceOptions,
  CivilizationSummary,
  CivilizationWorldOverlays,
  CivilizationWorldReader,
  DraftNpcSlot,
  ExpansionRecord,
  FillCivilizationsScope,
  LandUse,
  OverlayDraft,
  Point,
  PopulationAggregate,
  PopulationByKind,
  PopulationChange,
  ProposeCivilizationsOpts,
  RegionCivilizationSummary,
  RegionRecord,
  RegionSummary,
  SettlementKind,
  SparseOverlay,
  WorldMeta
} from './types.js'
export {
  CIVILIZATION_STATS_VERSION,
  LAND_USES,
  SETTLEMENT_KINDS
} from './types.js'
export { OVERLAY_KEYS, isOverlayKey, overlaysFromDraft, parseLandUse } from './overlayContract.js'
export {
  NPC_ROLE_HINTS,
  applyClaim,
  applyRelease,
  assertRoleHint,
  buildSlotId,
  claimNpcPlaceholder,
  clearNpcPlaceholderStore,
  copySlot,
  ensureNpcPlaceholders,
  listNpcPlaceholders,
  listUnassignedNpcPlaceholders,
  matchesUnassignedFilter,
  releaseNpcPlaceholder
} from './npcPlaceholders.js'
export type {
  EnsureNpcPlaceholdersInput,
  ListUnassignedFilter,
  NpcPlaceholderSlot,
  NpcPlaceholderStatus,
  NpcRoleHint
} from './npcPlaceholders.js'
export {
  capacityForKind,
  clampPopulation,
  eligibleKinds,
  evaluateKindRules,
  slotTargetForPopulation
} from './kindRules.js'
export type { KindCapacity } from './kindRules.js'
export { classifyUrbanLandUse, urbanDensityAt } from './urbanDensity.js'
export { proposeCivilizationsForRegion } from './propose.js'
export type { ProposeContext } from './propose.js'
export { aggregateFromRecords, applyPopulationChange, emptyAggregate } from './population.js'
export { createCivilizationStore } from './store/civilizationStore.js'
export type { CivilizationStore } from './store/civilizationStore.js'
export { createWorldOverlayAdapter } from './store/worldOverlayAdapter.js'
export { createCivilizationService } from './civilizationService.js'
export type { CivilizationService } from './civilizationService.js'
export {
  realizeSettlementNaming,
  SettlementNamingError
} from './settlementNaming.js'
export type {
  RealizeSettlementNamingOptions,
  SettlementNamingInput
} from './settlementNaming.js'
export { civilizationEngine } from './engineApi.js'
export type { CivilizationEngineApi } from './engineApi.js'
export {
  exportCampaignSlice as exportCivilizationCampaignSlice,
  importCampaignSlice as importCivilizationCampaignSlice,
  CIVILIZATION_SLICE_VERSION,
  CivilizationPortabilitySchemaError,
  type CivilizationCampaignSlice,
  type CivilizationPortabilityContext
} from './portability/index.js'
