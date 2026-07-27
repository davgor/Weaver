import { randomUUID } from 'node:crypto'
import type {
  PermanentizeVnStoryResult,
  VnStoryGenerationInput,
  VnStoryGenerationResult,
  VnStoryOverview
} from '@weaver/dm-engine'
import type {
  PlayVnStoryResult,
  VnSavedGameSummary,
  VnStoryDraft,
  VnStoryReviewSnapshot,
  VnStoryReviewStatus
} from '../../shared/story/types.js'
import { validateVnStoryDraft } from '../../shared/story/types.js'
import { ensureStoryLayout, listPermanentVnStories, resolveStoryPaths } from './storyDisk.js'

export type VnStoryGenerationPort = {
  generate: (input: VnStoryGenerationInput) => Promise<VnStoryGenerationResult>
  permanentize: (options: {
    campaignId: string
    filePath: string
  }) => PermanentizeVnStoryResult
  resolvePaths: (campaignId: string) => { dataRoot: string; campaignFilePath: string }
  ensureLayout: (campaignId: string) => void
  createCampaignId: () => string
  listSaved: () => VnSavedGameSummary[]
}

export type VnStoryService = {
  startGeneration: (draft: VnStoryDraft) => Promise<VnStoryReviewSnapshot>
  getReview: () => Promise<VnStoryReviewSnapshot | null>
  confirmReview: () => Promise<VnStoryReviewSnapshot>
  backToEdit: () => Promise<void>
  play: () => Promise<PlayVnStoryResult>
  listSavedGames: () => Promise<VnSavedGameSummary[]>
}

type ServiceState = {
  draft: VnStoryDraft | null
  campaignId: string | null
  result: VnStoryGenerationResult | null
  confirmed: boolean
  status: VnStoryReviewStatus
  errorMessage?: string
}

export function createVnStoryService(port: VnStoryGenerationPort): VnStoryService {
  const state = emptyState()
  return {
    startGeneration: (draft) => startGeneration(state, port, draft),
    getReview: async () => buildSnapshot(state),
    confirmReview: async () => confirmReview(state),
    backToEdit: async () => backToEdit(state),
    play: () => play(state, port),
    listSavedGames: async () => port.listSaved()
  }
}

export function createDiskStoryPort(
  storiesRoot: string,
  deps: {
    generate: VnStoryGenerationPort['generate']
    permanentize: VnStoryGenerationPort['permanentize']
  }
): VnStoryGenerationPort {
  return {
    generate: deps.generate,
    permanentize: deps.permanentize,
    resolvePaths: (campaignId) => resolveStoryPaths(storiesRoot, campaignId),
    ensureLayout: (campaignId) => ensureStoryLayout(storiesRoot, campaignId),
    createCampaignId: () => `vn-${randomUUID()}`,
    listSaved: () => listPermanentVnStories(storiesRoot)
  }
}

function emptyState(): ServiceState {
  return {
    draft: null,
    campaignId: null,
    result: null,
    confirmed: false,
    status: 'idle'
  }
}

async function startGeneration(
  state: ServiceState,
  port: VnStoryGenerationPort,
  draft: VnStoryDraft
): Promise<VnStoryReviewSnapshot> {
  validateVnStoryDraft(draft)
  state.draft = { ...draft, mainCharacter: { ...draft.mainCharacter } }
  state.campaignId = port.createCampaignId()
  state.confirmed = false
  state.status = 'generating'
  delete state.errorMessage
  try {
    port.ensureLayout(state.campaignId)
    const paths = port.resolvePaths(state.campaignId)
    state.result = await port.generate({
      campaignId: state.campaignId,
      dataRoot: paths.dataRoot,
      campaignFilePath: paths.campaignFilePath,
      premise: draft.premise,
      mainCharacter: draft.mainCharacter,
      actCount: draft.actCount,
      seed: `${state.campaignId}:start`,
      maxSeedRetries: 1,
      maxStageRetries: 1
    })
    state.status = 'ready'
  } catch (error) {
    state.status = 'error'
    state.errorMessage = error instanceof Error ? error.message : 'Story generation failed'
    state.result = null
  }
  return requireSnapshot(state)
}

async function confirmReview(state: ServiceState): Promise<VnStoryReviewSnapshot> {
  requireReady(state)
  state.confirmed = true
  return requireSnapshot(state)
}

async function backToEdit(state: ServiceState): Promise<void> {
  state.draft = null
  state.campaignId = null
  state.result = null
  state.confirmed = false
  state.status = 'idle'
  delete state.errorMessage
}

async function play(
  state: ServiceState,
  port: VnStoryGenerationPort
): Promise<PlayVnStoryResult> {
  requireReady(state)
  if (!state.confirmed) {
    throw new Error('Confirm the story overview before Play')
  }
  const campaignId = requireCampaignId(state)
  const paths = port.resolvePaths(campaignId)
  const result = port.permanentize({
    campaignId,
    filePath: paths.campaignFilePath
  })
  result.session.close()
  return { campaignId, lifecycle: result.lifecycle }
}

function buildSnapshot(state: ServiceState): VnStoryReviewSnapshot | null {
  if (state.status === 'idle' && state.campaignId === null) return null
  return {
    ...snapshotMeta(state),
    ...snapshotOverview(state)
  }
}

function snapshotMeta(
  state: ServiceState
): Pick<VnStoryReviewSnapshot, 'campaignId' | 'status' | 'confirmed' | 'errorMessage' | 'actCount'> {
  return {
    campaignId: state.campaignId ?? '',
    status: state.status,
    confirmed: state.confirmed,
    ...optionalError(state.errorMessage),
    actCount: state.draft?.actCount ?? overviewActs(state.result?.overview)
  }
}

function snapshotOverview(
  state: ServiceState
): Pick<
  VnStoryReviewSnapshot,
  'premiseSummary' | 'mainCharacter' | 'acts' | 'cast' | 'openingBeat' | 'overviewProse'
> {
  return overviewFields(state.result?.overview, state.draft)
}

function overviewFields(
  overview: VnStoryGenerationResult['overview'] | undefined,
  draft: VnStoryDraft | null
): Pick<
  VnStoryReviewSnapshot,
  'premiseSummary' | 'mainCharacter' | 'acts' | 'cast' | 'openingBeat' | 'overviewProse'
> {
  if (overview === undefined) {
    return emptyOverviewFields(draft)
  }
  return {
    premiseSummary: overview.premiseSummary,
    mainCharacter: overview.mainCharacter,
    acts: overview.acts,
    cast: overview.cast,
    openingBeat: overview.openingBeat,
    overviewProse: overview.overviewProse
  }
}

function emptyOverviewFields(draft: VnStoryDraft | null): Pick<
  VnStoryReviewSnapshot,
  'premiseSummary' | 'mainCharacter' | 'acts' | 'cast' | 'openingBeat' | 'overviewProse'
> {
  return {
    premiseSummary: '',
    mainCharacter: emptyMc(draft),
    acts: [],
    cast: [],
    openingBeat: '',
    overviewProse: ''
  }
}

function optionalError(message: string | undefined): { errorMessage?: string } {
  return message === undefined ? {} : { errorMessage: message }
}

function emptyMc(draft: VnStoryDraft | null) {
  return draft?.mainCharacter ?? { name: '', personality: '', appearance: '' }
}

function overviewActs(overview: VnStoryOverview | undefined): number {
  return overview?.acts.length ?? 0
}

function requireSnapshot(state: ServiceState): VnStoryReviewSnapshot {
  const snapshot = buildSnapshot(state)
  if (snapshot === null) {
    throw new Error('Story review is not available')
  }
  return snapshot
}

function requireReady(state: ServiceState): void {
  if (state.status !== 'ready' || state.result === null) {
    throw new Error('Story review is not ready')
  }
}

function requireCampaignId(state: ServiceState): string {
  if (state.campaignId === null) {
    throw new Error('Story campaign id is missing')
  }
  return state.campaignId
}
