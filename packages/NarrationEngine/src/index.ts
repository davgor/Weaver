export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type ImageProviderId = 'cloud' | 'player2' | 'local'
export type PortraitSubjectKind = 'npc' | 'enemy' | 'companion' | 'pc'

export type PortraitSubjectFacts = {
  race?: string
  description?: string
  name?: string
}

export type ImageGenerationSettings = {
  provider: ImageProviderId
  generativeTokensEnabled: boolean
}

export type ImageGenerateRequest = {
  subjectKind: PortraitSubjectKind
  prompt: string
  subjectId: string
  settings: ImageGenerationSettings
  subjectFacts: PortraitSubjectFacts
  campaignId?: string
}

export type ImageGenerateResult = {
  imagePath: string | null
  provider: ImageProviderId
  degraded: boolean
}

export type ProviderImageRequest = {
  provider: ImageProviderId
  subjectKind: PortraitSubjectKind
  prompt: string
  subjectId: string
  campaignId?: string
}

export type ImageProvider = {
  id: ImageProviderId
  generate: (request: ProviderImageRequest) => Promise<string | null>
}

export type ImageFetchRequest = {
  method: 'POST'
  headers: Record<string, string>
  body: string
}

export type ImageFetchResponse = {
  ok: boolean
  json: () => Promise<unknown>
}

export type ImageFetch = (url: string, request: ImageFetchRequest) => Promise<ImageFetchResponse>

export type LocalImageRuntime = {
  generateImage: (request: ProviderImageRequest) => Promise<string | null>
}

export type {
  ClaimValidationResult,
  FactualClaim,
  PersistOutcome,
  SceneBlock,
  SceneGenerateInput,
  SilentResolveDecision,
  SocialGenerateInput,
  SocialLine,
  SocialSpeakerKind,
  SocialStreamEvent,
  TurnInterestInput
} from './proseTypes.js'
export type {
  ItemPresenceLookup,
  LocationLookup,
  NarrationPeers,
  NpcPresenceLookup,
  NpcPresenceRecord,
  TextCompleter,
  TextCompletionRequest,
  TextCompletionResponse
} from './peers.js'
export { fillAndValidate, fillSkeleton, parseLabeledBlocks } from './skeletonFill.js'
export type { FillAndValidateInput, FillAndValidateResult } from './skeletonFill.js'
export { generateGuidedIdentityReply } from './guidedIdentity.js'
export type {
  GuidedIdentityInput,
  GuidedIdentityPhase,
  GuidedIdentityResult
} from './guidedIdentity.js'
export { extractClaims, stripClaimBlock } from './claimExtract.js'
export { validateClaims } from './claimValidate.js'
export { applyTerminologyGuards, findForbiddenTerminology } from './terminologyGuards.js'
export type { TerminologyGuardResult, TerminologyRewrite } from './terminologyGuards.js'
export { validateProseTone } from './toneGuard.js'
export type { ProseToneValidation } from './toneGuard.js'
export {
  deityNameFallback,
  resolveDeityName,
  validateDeityName
} from './deityNameValidate.js'
export {
  realizePantheon,
  realizePlaceNaming,
  sealPantheon,
  sealPlaceNaming
} from './worldNaming.js'
export type {
  PantheonDeity,
  PantheonNaming,
  PantheonOutcome,
  PlaceNaming,
  PlaceNamingOutcome,
  PlaceStats,
  RealizePantheonInput,
  RealizePlaceNamingInput,
  RegionPlaceStats,
  SettlementPlaceStats
} from './worldNaming.js'
export type { DeityNameValidation, ResolvedDeityName } from './deityNameValidate.js'
export { validateProse } from './proseValidate.js'
export type { ProseValidationResult } from './proseValidate.js'
export { decideSilentResolve } from './silentResolve.js'
export {
  clearNarrationStore,
  generateScene,
  projectScene,
  projectSocial,
  recordPlayerSocial,
  streamSocial
} from './proseApi.js'
export { createRagIndex, DEFAULT_RAG_MAX_CHARS, RAG_REINDEX_NOTE } from './rag/ragIndex.js'
export type {
  CampaignFactCategory,
  EmbedderMode,
  IndexCampaignFactOptions,
  RagChunk,
  RagEmbedder,
  RagIndex,
  RetrieveRelevantChunksInput,
  RetrieveRelevantChunksResult
} from './rag/ragIndex.js'

import {
  generateGuidedIdentityReply,
  type GuidedIdentityInput,
  type GuidedIdentityPhase
} from './guidedIdentity.js'
import type { NarrationPeers, TextCompleter } from './peers.js'
import { buildProseEndpoints } from './proseEndpoints.js'
import { buildRagEndpoints } from './rag/ragEndpoints.js'
import {
  clearNarrationStore,
  generateScene,
  projectScene,
  projectSocial,
  recordPlayerSocial,
  streamSocial
} from './proseApi.js'
import { decideSilentResolve } from './silentResolve.js'
import { fillAndValidate, type FillAndValidateInput } from './skeletonFill.js'

export type GeneratePortraitDeps = {
  providers?: Partial<Record<ImageProviderId, ImageProvider>>
}

export type ManualPortraitStore = {
  saveManualPortrait: (characterId: string, imagePath: string) => Promise<void> | void
}

export type SetManualPortraitDeps = {
  store?: ManualPortraitStore
}

export type ManualPortraitResult = {
  characterId: string
  imagePath: string
}

export type PortraitSubjectValidation = {
  ok: boolean
  errors: string[]
}

export type NarrationRoleDescription = {
  inventsStories: true
  inventsVisualTokens: true
  validatesAgainst: string[]
  visualTokenSubjects: PortraitSubjectKind[]
  note: string
}

export type NarrationEngineApi = {
  id: 'NarrationEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  describeRole: () => NarrationRoleDescription
  generatePortrait: (
    request: ImageGenerateRequest,
    deps?: GeneratePortraitDeps
  ) => Promise<ImageGenerateResult>
  setManualPortrait: (
    characterId: string,
    imagePath: string,
    deps?: SetManualPortraitDeps
  ) => Promise<ManualPortraitResult>
  projectSocial: typeof projectSocial
  projectScene: typeof projectScene
  recordPlayerSocial: typeof recordPlayerSocial
  generateScene: typeof generateScene
  streamSocial: typeof streamSocial
  decideSilentResolve: typeof decideSilentResolve
  fillAndValidate: typeof fillAndValidate
  generateGuidedIdentityReply: typeof generateGuidedIdentityReply
  clearNarrationStore: typeof clearNarrationStore
  setPeers: (peers: NarrationPeers | undefined) => void
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/narration-engine'
const VERSION = '0.1.0'
const VISUAL_TOKEN_SUBJECTS: PortraitSubjectKind[] = ['npc', 'enemy', 'companion', 'pc']

type FetchProviderDeps = {
  endpoint: string
  fetch: ImageFetch
}

type UnknownRecord = Record<string, unknown>

export function describeRole(): NarrationRoleDescription {
  return {
    inventsStories: true,
    inventsVisualTokens: true,
    validatesAgainst: ['world', 'items', 'npcs', 'enemies', 'combat'],
    visualTokenSubjects: VISUAL_TOKEN_SUBJECTS,
    note: 'Narration invents prose and visual tokens; facts must be validated with peer engine data.'
  }
}

export function buildPortraitPrompt(request: ImageGenerateRequest): string {
  return [
    `Subject kind: ${request.subjectKind}`,
    `Subject id: ${request.subjectId}`,
    optionalFactLine('Name', request.subjectFacts.name),
    optionalFactLine('Race', request.subjectFacts.race),
    optionalFactLine('Description', request.subjectFacts.description),
    `Base prompt: ${request.prompt}`
  ]
    .filter(isText)
    .join('\n')
}

export function validatePortraitSubject(request: ImageGenerateRequest): PortraitSubjectValidation {
  const errors = [
    requiredTextError('subjectId', request.subjectId),
    requiredTextError('prompt', request.prompt),
    requiredTextError('subjectFacts.race', request.subjectFacts.race),
    requiredTextError('subjectFacts.description', request.subjectFacts.description)
  ].filter(isText)

  return { ok: errors.length === 0, errors }
}

export async function generatePortrait(
  request: ImageGenerateRequest,
  deps: GeneratePortraitDeps = {}
): Promise<ImageGenerateResult> {
  const providerId = request.settings.provider
  if (!request.settings.generativeTokensEnabled || !validatePortraitSubject(request).ok) {
    return degraded(providerId)
  }

  const provider = deps.providers?.[providerId]
  if (!provider) {
    return degraded(providerId)
  }

  try {
    const imagePath = await provider.generate(providerRequest(request))
    return hasText(imagePath) ? { imagePath, provider: providerId, degraded: false } : degraded(providerId)
  } catch {
    return degraded(providerId)
  }
}

export async function setManualPortrait(
  characterId: string,
  imagePath: string,
  deps: SetManualPortraitDeps = {}
): Promise<ManualPortraitResult> {
  if (!hasText(characterId) || !hasText(imagePath)) {
    throw new Error('Manual portraits require a characterId and imagePath.')
  }
  await deps.store?.saveManualPortrait(characterId, imagePath)
  return { characterId, imagePath }
}

export function createCloudImageProvider(deps: FetchProviderDeps): ImageProvider {
  return createFetchImageProvider('cloud', deps)
}

export function createPlayer2ImageProvider(deps: FetchProviderDeps): ImageProvider {
  return createFetchImageProvider('player2', deps)
}

export function createLocalImageProvider(deps: { runtime: LocalImageRuntime }): ImageProvider {
  return {
    id: 'local',
    generate: async (request) => deps.runtime.generateImage(request)
  }
}

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'describeRole',
      description: 'Describe LLM narration, visual token, and validation responsibilities',
      invoke: () => describeRole()
    },
    {
      name: 'generatePortrait',
      description: 'Generate an NPC, enemy, companion, or PC portrait through configured image rails',
      invoke: (payload) => generatePortrait(assertImageGenerateRequest(payload))
    },
    {
      name: 'setManualPortrait',
      description: 'Set or replace a manual player-character portrait path',
      invoke: async (payload) => {
        const request = assertManualPortraitPayload(payload)
        return await setManualPortrait(request.characterId, request.imagePath)
      }
    },
    {
      name: 'fillAndValidate',
      description: 'Fill a labeled skeleton and validate output against supplied facts',
      invoke: async (payload) =>
        await fillAndValidate(assertFillAndValidatePayload(payload), requireTextCompleter())
    },
    {
      name: 'guidedIdentity.reply',
      description: 'Generate a fact-grounded guided character identity reply',
      invoke: async (payload) =>
        await generateGuidedIdentityReply(assertGuidedIdentityPayload(payload), requireTextCompleter())
    },
    ...buildProseEndpoints(() => injectedPeers),
    ...buildRagEndpoints()
  ]
}

let injectedPeers: NarrationPeers | undefined

export const narrationEngine: NarrationEngineApi = {
  id: 'NarrationEngine',
  title: 'Narration Engine',
  description: 'LLM story and visual-token invention validated against engine data',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  describeRole,
  generatePortrait,
  setManualPortrait,
  projectSocial,
  projectScene,
  recordPlayerSocial,
  generateScene,
  streamSocial,
  decideSilentResolve,
  fillAndValidate,
  generateGuidedIdentityReply,
  clearNarrationStore,
  setPeers(peers) {
    injectedPeers = peers
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

function createFetchImageProvider(id: ImageProviderId, deps: FetchProviderDeps): ImageProvider {
  return {
    id,
    generate: async (request) => {
      const response = await deps.fetch(deps.endpoint, fetchRequest(request))
      if (!response.ok) {
        return null
      }
      return imagePathFromBody(await response.json())
    }
  }
}

function fetchRequest(request: ProviderImageRequest): ImageFetchRequest {
  return {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request)
  }
}

function providerRequest(request: ImageGenerateRequest): ProviderImageRequest {
  const base = {
    provider: request.settings.provider,
    subjectKind: request.subjectKind,
    subjectId: request.subjectId,
    prompt: buildPortraitPrompt(request)
  }
  return hasText(request.campaignId) ? { ...base, campaignId: request.campaignId } : base
}

function degraded(provider: ImageProviderId): ImageGenerateResult {
  return { imagePath: null, provider, degraded: true }
}

function optionalFactLine(label: string, value: string | undefined): string | null {
  return hasText(value) ? `${label}: ${value}` : null
}

function requiredTextError(field: string, value: string | undefined): string | null {
  return hasText(value) ? null : `${field} is required`
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function isText(value: string | null): value is string {
  return value !== null
}

function imagePathFromBody(body: unknown): string | null {
  if (!isRecord(body)) {
    return null
  }
  const imagePath = readString(body, 'imagePath')
  return hasText(imagePath) ? imagePath : null
}

function assertImageGenerateRequest(payload: unknown): ImageGenerateRequest {
  if (isImageGenerateRequest(payload)) {
    return payload
  }
  throw new Error('generatePortrait endpoint requires an ImageGenerateRequest payload.')
}

function assertManualPortraitPayload(payload: unknown): ManualPortraitResult {
  if (!isRecord(payload)) {
    throw new Error('setManualPortrait endpoint requires characterId and imagePath.')
  }
  const characterId = readString(payload, 'characterId')
  const imagePath = readString(payload, 'imagePath')
  if (!hasText(characterId) || !hasText(imagePath)) {
    throw new Error('setManualPortrait endpoint requires characterId and imagePath.')
  }
  return { characterId, imagePath }
}

function assertFillAndValidatePayload(payload: unknown): FillAndValidateInput {
  const record = assertEndpointRecord(payload, 'fillAndValidate')
  const seed = optionalPayloadString(record, 'seed')
  const input = {
    skeleton: requiredPayloadString(record, 'skeleton', 'fillAndValidate'),
    facts: readStringMap(record, 'facts', 'fillAndValidate'),
    stage: requiredPayloadString(record, 'stage', 'fillAndValidate')
  }
  return seed === undefined ? input : { ...input, seed }
}

function assertGuidedIdentityPayload(payload: unknown): GuidedIdentityInput {
  const record = assertEndpointRecord(payload, 'guidedIdentity.reply')
  const seed = optionalPayloadString(record, 'seed')
  const input = {
    phase: readGuidedIdentityPhase(record.phase),
    transcript: readTranscript(record.transcript),
    characterFacts: readStringMap(record, 'characterFacts', 'guidedIdentity.reply')
  }
  return seed === undefined ? input : { ...input, seed }
}

function requireTextCompleter(): TextCompleter {
  if (injectedPeers === undefined) {
    throw new Error('Narration skeleton endpoints require injected peers')
  }
  return injectedPeers.llm
}

function assertEndpointRecord(payload: unknown, label: string): UnknownRecord {
  if (!isRecord(payload)) {
    throw new Error(`${label} endpoint requires an object payload.`)
  }
  return payload
}

function requiredPayloadString(record: UnknownRecord, key: string, label: string): string {
  const value = readString(record, key)
  if (!hasText(value)) {
    throw new Error(`${label} endpoint requires string ${key}.`)
  }
  return value
}

function optionalPayloadString(record: UnknownRecord, key: string): string | undefined {
  const value = readString(record, key)
  return hasText(value) ? value : undefined
}

function readStringMap(record: UnknownRecord, key: string, label: string): Record<string, string> {
  const value = record[key]
  if (!isRecord(value)) {
    throw new Error(`${label} endpoint requires string map ${key}.`)
  }

  const result: Record<string, string> = {}
  for (const [mapKey, mapValue] of Object.entries(value)) {
    if (typeof mapValue !== 'string') {
      throw new Error(`${label} endpoint requires string map ${key}.`)
    }
    result[mapKey] = mapValue
  }
  return result
}

function readGuidedIdentityPhase(value: unknown): GuidedIdentityPhase {
  if (value === 'who' || value === 'why' || value === 'where' || value === 'what') {
    return value
  }
  throw new Error('guidedIdentity.reply endpoint requires phase who|why|where|what.')
}

function readTranscript(value: unknown): string | readonly string[] {
  if (typeof value === 'string' && hasText(value)) {
    return value
  }
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
    return value
  }
  throw new Error('guidedIdentity.reply endpoint requires transcript string or string array.')
}

function isImageGenerateRequest(payload: unknown): payload is ImageGenerateRequest {
  return (
    isRecord(payload) &&
    isSubjectKind(payload.subjectKind) &&
    hasText(readString(payload, 'prompt')) &&
    hasText(readString(payload, 'subjectId')) &&
    isImageGenerationSettings(payload.settings) &&
    isPortraitSubjectFacts(payload.subjectFacts)
  )
}

function isImageGenerationSettings(payload: unknown): payload is ImageGenerationSettings {
  return (
    isRecord(payload) &&
    isProviderId(payload.provider) &&
    typeof payload.generativeTokensEnabled === 'boolean'
  )
}

function isPortraitSubjectFacts(payload: unknown): payload is PortraitSubjectFacts {
  if (!isRecord(payload)) {
    return false
  }
  return optionalString(payload.race) && optionalString(payload.description) && optionalString(payload.name)
}

function optionalString(value: unknown): boolean {
  return typeof value === 'undefined' || typeof value === 'string'
}

function isSubjectKind(value: unknown): value is PortraitSubjectKind {
  return value === 'npc' || value === 'enemy' || value === 'companion' || value === 'pc'
}

function isProviderId(value: unknown): value is ImageProviderId {
  return value === 'cloud' || value === 'player2' || value === 'local'
}

function readString(record: UnknownRecord, key: string): string | undefined {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
