import { randomUUID } from 'node:crypto'
import type { CampaignGenerationInput, CampaignGenerationResult } from '@weaver/dm-engine'
import type {
  CampaignCreateDraft,
  CampaignReviewSection,
  CampaignReviewSnapshot,
  GenerateRegionNpcRequest,
  RegenerateSectionRequest,
  UpdateReviewFieldRequest
} from '../../shared/campaignCreate/types.js'
import { validateCampaignCreateDraft } from '../../shared/campaignCreate/types.js'

function assertReviewConfirmed(confirmed: boolean): void {
  if (!confirmed) {
    throw new Error('Campaign review must be confirmed before continuing to onboarding')
  }
}

export type CampaignCreateGenerationPort = {
  generate: (input: CampaignGenerationInput) => Promise<CampaignGenerationResult>
  resolvePaths: (campaignId: string) => { dataRoot: string; campaignFilePath: string }
  createCampaignId: () => string
}

export type CampaignCreateService = {
  startGeneration: (draft: CampaignCreateDraft) => Promise<CampaignReviewSnapshot>
  getReview: () => Promise<CampaignReviewSnapshot | null>
  updateReviewField: (request: UpdateReviewFieldRequest) => Promise<CampaignReviewSnapshot>
  regenerateSection: (request: RegenerateSectionRequest) => Promise<CampaignReviewSnapshot>
  generateRegionNpc: (request: GenerateRegionNpcRequest) => Promise<CampaignReviewSnapshot>
  confirmReview: () => Promise<CampaignReviewSnapshot>
  assertCanContinue: () => Promise<void>
}

type ReviewEdits = {
  canon?: string
  pantheon?: string
  worldSummary?: string
  bestiaryFlavor?: string
  regions: Record<string, { displayName?: string; summary?: string }>
  npcs: Record<string, { displayName?: string; summary?: string }>
  factions: Record<string, { name?: string; purpose?: string }>
}

type ServiceState = {
  draft: CampaignCreateDraft | null
  campaignId: string | null
  result: CampaignGenerationResult | null
  confirmed: boolean
  status: CampaignReviewSnapshot['status']
  errorMessage?: string
  edits: ReviewEdits
}

export function createCampaignCreateService(port: CampaignCreateGenerationPort): CampaignCreateService {
  const state = emptyState()
  return {
    startGeneration: (draft) => startGeneration(state, port, draft),
    getReview: async () => buildSnapshot(state),
    updateReviewField: (request) => updateReviewField(state, request),
    regenerateSection: (request) => regenerateSection(state, port, request),
    generateRegionNpc: (request) => generateRegionNpc(state, port, request),
    confirmReview: async () => confirmReview(state),
    assertCanContinue: async () => assertCanContinue(state)
  }
}

function emptyState(): ServiceState {
  return {
    draft: null,
    campaignId: null,
    result: null,
    confirmed: false,
    status: 'idle',
    edits: { regions: {}, npcs: {}, factions: {} }
  }
}

async function startGeneration(
  state: ServiceState,
  port: CampaignCreateGenerationPort,
  draft: CampaignCreateDraft
): Promise<CampaignReviewSnapshot> {
  validateCampaignCreateDraft(draft)
  state.draft = { ...draft }
  state.campaignId = port.createCampaignId()
  state.confirmed = false
  state.edits = { regions: {}, npcs: {}, factions: {} }
  state.status = 'generating'
  delete state.errorMessage
  try {
    state.result = await runGeneration(port, state.campaignId, draft, 'start')
    state.status = 'ready'
  } catch (error) {
    state.status = 'error'
    state.errorMessage = errorMessage(error)
    state.result = null
  }
  return requireSnapshot(state)
}

async function updateReviewField(
  state: ServiceState,
  request: UpdateReviewFieldRequest
): Promise<CampaignReviewSnapshot> {
  requireReady(state)
  if (request.field === 'generativeTokensEnabled') {
    throw new Error('Generative tokens are fixed at campaign start')
  }
  applyReviewEdit(state.edits, request)
  state.confirmed = false
  return requireSnapshot(state)
}

async function regenerateSection(
  state: ServiceState,
  port: CampaignCreateGenerationPort,
  request: RegenerateSectionRequest
): Promise<CampaignReviewSnapshot> {
  requireReady(state)
  const draft = requireDraft(state)
  const campaignId = requireCampaignId(state)
  const regenerated = await runGeneration(port, campaignId, draft, `regen:${request.section}`)
  mergeSection(state, regenerated, request.section)
  state.confirmed = false
  return requireSnapshot(state)
}

async function generateRegionNpc(
  state: ServiceState,
  port: CampaignCreateGenerationPort,
  request: GenerateRegionNpcRequest
): Promise<CampaignReviewSnapshot> {
  requireReady(state)
  const draft = requireDraft(state)
  const campaignId = requireCampaignId(state)
  const current = requireResult(state)
  if (!current.regions.some((region) => region.regionId === request.regionId)) {
    throw new Error(`Unknown region: ${request.regionId}`)
  }

  const generated = await port.generate({
    campaignId,
    ...port.resolvePaths(campaignId),
    regionCount: 1,
    npcsPerRegion: 1,
    premise: draft.premise,
    seed: `region-npc:${request.regionId}:${randomUUID()}`
  })
  const nextNpc = generated.npcs[0]
  if (nextNpc === undefined) {
    throw new Error('DMEngine did not return an NPC for the region')
  }
  current.npcs.push({ ...nextNpc, regionId: request.regionId })
  state.confirmed = false
  return requireSnapshot(state)
}

async function confirmReview(state: ServiceState): Promise<CampaignReviewSnapshot> {
  requireReady(state)
  state.confirmed = true
  return requireSnapshot(state)
}

async function assertCanContinue(state: ServiceState): Promise<void> {
  requireReady(state)
  assertReviewConfirmed(state.confirmed)
}

async function runGeneration(
  port: CampaignCreateGenerationPort,
  campaignId: string,
  draft: CampaignCreateDraft,
  seedSuffix: string
): Promise<CampaignGenerationResult> {
  const paths = port.resolvePaths(campaignId)
  return port.generate({
    campaignId,
    dataRoot: paths.dataRoot,
    campaignFilePath: paths.campaignFilePath,
    regionCount: draft.regionCount,
    npcsPerRegion: draft.npcsPerRegion,
    premise: draft.premise,
    seed: `${campaignId}:${seedSuffix}`
  })
}

function mergeSection(
  state: ServiceState,
  regenerated: CampaignGenerationResult,
  section: CampaignReviewSection
): void {
  const current = requireResult(state)
  if (section === 'world') {
    current.canon = regenerated.canon
    current.worldSummary = regenerated.worldSummary
    delete state.edits.canon
    delete state.edits.worldSummary
    return
  }
  if (section === 'pantheon') {
    current.pantheon = regenerated.pantheon
    delete state.edits.pantheon
    return
  }
  if (section === 'bestiary') {
    current.bestiaryFlavor = regenerated.bestiaryFlavor
    delete state.edits.bestiaryFlavor
    return
  }
  if (section === 'regions') {
    current.regions = regenerated.regions
    state.edits.regions = {}
    return
  }
  if (section === 'npcs') {
    current.npcs = regenerated.npcs
    state.edits.npcs = {}
    return
  }
  if (section === 'factions') {
    current.factions = regenerated.factions
    state.edits.factions = {}
  }
}

function applyReviewEdit(state: ReviewEdits, request: UpdateReviewFieldRequest): void {
  if (request.section === 'world') {
    applyWorldEdit(state, request)
    return
  }
  if (request.section === 'pantheon' && request.field === 'pantheon') {
    state.pantheon = request.value
    return
  }
  if (request.section === 'bestiary' && request.field === 'bestiaryFlavor') {
    state.bestiaryFlavor = request.value
    return
  }
  if (request.section === 'regions') {
    applyEntityEdit({ bucket: state.regions, entityId: request.entityId, field: request.field, value: request.value, label: 'region' })
    return
  }
  if (request.section === 'npcs') {
    applyEntityEdit({ bucket: state.npcs, entityId: request.entityId, field: request.field, value: request.value, label: 'npc' })
    return
  }
  if (request.section === 'factions') {
    applyEntityEdit({ bucket: state.factions, entityId: request.entityId, field: request.field, value: request.value, label: 'faction' })
    return
  }
  throw new Error(`Unsupported review field: ${request.section}.${request.field}`)
}

function applyWorldEdit(state: ReviewEdits, request: UpdateReviewFieldRequest): void {
  if (request.field === 'canon') {
    state.canon = request.value
    return
  }
  if (request.field === 'worldSummary') {
    state.worldSummary = request.value
    return
  }
  throw new Error(`Unsupported world field: ${request.field}`)
}

type EntityEditRequest = {
  bucket: Record<string, Record<string, string>>
  entityId: string | undefined
  field: string
  value: string
  label: string
}

function applyEntityEdit(request: EntityEditRequest): void {
  if (request.entityId === undefined || request.entityId.length === 0) {
    throw new Error(`${request.label} edits require entityId`)
  }
  const current = request.bucket[request.entityId] ?? {}
  request.bucket[request.entityId] = { ...current, [request.field]: request.value }
}

function buildSnapshot(state: ServiceState): CampaignReviewSnapshot | null {
  if (state.status === 'idle' && state.campaignId === null) return null
  return {
    ...snapshotMeta(state),
    ...snapshotText(state),
    regions: mapRegions(state.result, state.edits.regions),
    npcs: mapNpcs(state.result, state.edits.npcs),
    factions: mapFactions(state.result, state.edits.factions)
  }
}

function snapshotMeta(state: ServiceState): Pick<
  CampaignReviewSnapshot,
  | 'campaignId'
  | 'campaignName'
  | 'deathMode'
  | 'generativeTokensEnabled'
  | 'confirmed'
  | 'status'
  | 'errorMessage'
> {
  const draft = state.draft
  const meta = {
    campaignId: state.campaignId ?? '',
    campaignName: draft?.name?.trim() || 'Untitled Campaign',
    deathMode: draft?.deathMode ?? 'standard',
    generativeTokensEnabled: draft?.generativeTokensEnabled ?? false,
    confirmed: state.confirmed,
    status: state.status
  }
  if (state.errorMessage === undefined) {
    return meta
  }
  return { ...meta, errorMessage: state.errorMessage }
}

function snapshotText(
  state: ServiceState
): Pick<
  CampaignReviewSnapshot,
  'canon' | 'pantheon' | 'worldSummary' | 'bestiaryFlavor' | 'storyPremise'
> {
  const result = state.result
  return {
    canon: editedText(state.edits.canon, result?.canon),
    pantheon: editedText(state.edits.pantheon, result?.pantheon),
    worldSummary: editedText(state.edits.worldSummary, result?.worldSummary),
    bestiaryFlavor: editedText(state.edits.bestiaryFlavor, result?.bestiaryFlavor),
    storyPremise: result?.storyPremise ?? ''
  }
}

function editedText(edit: string | undefined, generated: string | undefined): string {
  return edit ?? generated ?? ''
}

function mapRegions(
  result: CampaignGenerationResult | null,
  edits: ReviewEdits['regions']
): CampaignReviewSnapshot['regions'] {
  return (result?.regions ?? []).map((region) => {
    const overlay = edits[region.regionId]
    return {
      regionId: region.regionId,
      displayName: overlay?.displayName ?? region.displayName ?? region.regionId,
      summary: overlay?.summary ?? region.history ?? region.dominantLandType
    }
  })
}

function mapNpcs(
  result: CampaignGenerationResult | null,
  edits: ReviewEdits['npcs']
): CampaignReviewSnapshot['npcs'] {
  return (result?.npcs ?? []).map((npc) => {
    const overlay = edits[npc.npcId]
    return {
      npcId: npc.npcId,
      regionId: npc.regionId,
      displayName: overlay?.displayName ?? npc.displayName ?? npc.npcId,
      summary: overlay?.summary ?? npc.dialogueFlavor ?? npc.identity.temperament
    }
  })
}

function mapFactions(
  result: CampaignGenerationResult | null,
  edits: ReviewEdits['factions']
): CampaignReviewSnapshot['factions'] {
  return (result?.factions ?? []).map((faction) => {
    const overlay = edits[faction.factionId]
    return {
      factionId: faction.factionId,
      name: overlay?.name ?? faction.name,
      purpose: overlay?.purpose ?? ''
    }
  })
}

function requireSnapshot(state: ServiceState): CampaignReviewSnapshot {
  const snapshot = buildSnapshot(state)
  if (snapshot === null) {
    throw new Error('Campaign review is not available')
  }
  return snapshot
}

function requireReady(state: ServiceState): void {
  if (state.status !== 'ready' || state.result === null) {
    throw new Error('Campaign review is not ready')
  }
}

function requireDraft(state: ServiceState): CampaignCreateDraft {
  if (state.draft === null) {
    throw new Error('Campaign draft is missing')
  }
  return state.draft
}

function requireCampaignId(state: ServiceState): string {
  if (state.campaignId === null) {
    throw new Error('Campaign id is missing')
  }
  return state.campaignId
}

function requireResult(state: ServiceState): CampaignGenerationResult {
  if (state.result === null) {
    throw new Error('Campaign generation result is missing')
  }
  return state.result
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Campaign generation failed'
}
