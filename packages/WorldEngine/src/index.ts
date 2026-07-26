export type { EngineEndpoint } from './typesApi.js'
export type {
  Aabb,
  Cell,
  ChunkRecord,
  ExpansionRecord,
  LandType,
  NoiseParams,
  SparseOverlay,
  WorldMeta
} from './types.js'
export {
  CHUNK_SIZE,
  LAND_TYPE_OVERRIDE_KEY,
  LAND_TYPES,
  aabbCellCount,
  aabbContainsPoint,
  aabbHeight,
  aabbIntersects,
  aabbWidth,
  applyLandTypeOverride,
  assertAabb,
  assertExpansionRecord,
  assertLandType,
  decodeLandType,
  encodeLandType,
  unionAabb
} from './types.js'
export { DEFAULT_NOISE, classifyLandType, createWorldCell, perlinElevation } from './noise/perlin.js'
export { createWorldService } from './store/worldService.js'
export type { CreateWorldOptions, ExpandWorldOptions, WorldService } from './store/worldService.js'
export { worldEngine } from './engineApi.js'
export type { WorldEngineApi } from './engineApi.js'
export {
  exportCampaignSlice as exportWorldCampaignSlice,
  importCampaignSlice as importWorldCampaignSlice,
  WORLD_SLICE_VERSION,
  WorldPortabilitySchemaError,
  type WorldCampaignSlice,
  type WorldPortabilityContext
} from './portability/index.js'
