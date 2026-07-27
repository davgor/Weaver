import {
  advanceVnPlayCursor,
  generateVnChoicePair,
  initialVnPlayCursor,
  openCampaign,
  openCampaignSession,
  readCatalogEntry,
  readVnPlayCursorOnSession,
  resolveTurn,
  writeVnPlayCursorOnSession,
  type CampaignSession,
  type ResolveTurnDeps,
  type ResolveTurnResult,
  type VnMainCharacterBrief,
  type VnPlayCursor,
  type VnStoryCastMember,
  type VnStoryOverview
} from '@weaver/dm-engine'
import { projectScene, projectSocial } from '@weaver/narration-engine'
import type { SceneBlock, SocialLine, TextCompleter } from '@weaver/narration-engine'
import type {
  SubmitVnPlayActionRequest,
  VnPlaySnapshot
} from '../../shared/play/types.js'
import { vnModeFromNarration } from '../../shared/play/vnMode.js'
import { resolveStoryPaths } from '../story/storyDisk.js'
import { incrementStoryTurns, shouldCompleteAct } from './playCursorPersist.js'
import { assemblePlaySnapshot, restorePlaySnapshot } from './restorePlaySnapshot.js'
import type { VnAssetService } from './vnAssetService.js'

export type VnPlayService = {
  open: (campaignId: string) => Promise<VnPlaySnapshot>
  submitAction: (request: SubmitVnPlayActionRequest) => Promise<VnPlaySnapshot>
}

export type VnPlayCatalogPort = {
  loadStory: (campaignId: string) => {
    overview: VnStoryOverview
    cast: VnStoryCastMember[]
    openSession: () => CampaignSession
  }
}

export type VnPlayServiceDeps = {
  catalog: VnPlayCatalogPort
  completer: TextCompleter
  resolveTurnDeps: ResolveTurnDeps
  resolveTurnFn?: typeof resolveTurn
  /** Optional async image asset pipeline. Fire-and-forget; never blocks turns. */
  assets?: VnAssetService
}

type LoadedStory = {
  overview: VnStoryOverview
  cast: VnStoryCastMember[]
}

type PlayContext = {
  campaignId: string
  characterId: string
  session: CampaignSession
  loaded: LoadedStory
}

type ActivePlay = {
  campaignId: string
  characterId: string
  session: CampaignSession
  overview: VnStoryOverview
  cast: VnStoryCastMember[]
  snapshot: VnPlaySnapshot
  cursor: VnPlayCursor
}

export function createVnPlayService(deps: VnPlayServiceDeps): VnPlayService {
  let active: ActivePlay | null = null
  const turn = deps.resolveTurnFn ?? resolveTurn
  return {
    open: async (campaignId) => {
      if (active !== null) {
        active.session.close()
        deps.assets?.cancel()
      }
      active = await openPlay(deps, campaignId)
      queueAssets(deps, active.snapshot)
      return active.snapshot
    },
    submitAction: async (request) => {
      if (active === null || active.campaignId !== request.campaignId) {
        throw new Error('No active VN play session for this campaign')
      }
      active = await submitPlay(deps, turn, active, request)
      queueAssets(deps, active.snapshot)
      return active.snapshot
    }
  }
}

/** Fire-and-forget asset queueing. Image errors must never fail a turn (126.5). */
function queueAssets(deps: VnPlayServiceDeps, snapshot: VnPlaySnapshot): void {
  if (deps.assets === undefined) return
  try {
    deps.assets.queueFromSnapshot(snapshot)
  } catch {
    // Asset generation is best-effort; swallow so open/submit still resolve.
  }
}

export function createDiskVnPlayCatalog(storiesRoot: string): VnPlayCatalogPort {
  return {
    loadStory: (campaignId) => {
      const paths = resolveStoryPaths(storiesRoot, campaignId)
      const handle = openCampaign({ campaignId, filePath: paths.campaignFilePath })
      let overview: VnStoryOverview
      let cast: VnStoryCastMember[]
      try {
        overview = requireOverview(handle, campaignId)
        cast = requireCast(handle)
      } finally {
        handle.close()
      }
      return {
        overview,
        cast,
        openSession: () =>
          openCampaignSession({ campaignId, filePath: paths.campaignFilePath })
      }
    }
  }
}

async function openPlay(deps: VnPlayServiceDeps, campaignId: string): Promise<ActivePlay> {
  const loaded = deps.catalog.loadStory(campaignId)
  const session = loaded.openSession()
  const characterId = `${campaignId}-vn-mc`
  const context: PlayContext = { campaignId, characterId, session, loaded }
  const existing = readVnPlayCursorOnSession(session)
  if (existing !== undefined) {
    return resumePlay(context, existing)
  }
  return startFreshPlay(deps, context)
}

function resumePlay(context: PlayContext, cursor: VnPlayCursor): ActivePlay {
  const history = safeProjections()
  const snapshot = restorePlaySnapshot({
    cursor,
    overview: context.loaded.overview,
    cast: context.loaded.cast,
    ...(history.scene !== undefined ? { scene: history.scene } : {}),
    ...(history.social !== undefined ? { social: history.social } : {})
  })
  return toActivePlay(context, snapshot, cursor)
}

async function startFreshPlay(
  deps: VnPlayServiceDeps,
  context: PlayContext
): Promise<ActivePlay> {
  const { overview } = context.loaded
  const choices = await requireChoices(deps.completer, overview.mainCharacter, overview.openingBeat)
  const cursor = initialVnPlayCursor({
    campaignId: context.campaignId,
    characterId: context.characterId,
    openingBeat: overview.openingBeat,
    options: choices
  })
  writeVnPlayCursorOnSession(context.session, cursor)
  const snapshot = assemblePlaySnapshot({
    campaignId: context.campaignId,
    characterId: context.characterId,
    overview,
    cast: context.loaded.cast,
    mode: 'scene',
    beatText: overview.openingBeat,
    speakerId: null,
    options: choices,
    scene: [{ id: 'opening', text: overview.openingBeat, at: Date.now() }],
    social: [],
    phase: cursor.phase,
    storyComplete: cursor.storyComplete,
    actIndex: cursor.actIndex
  })
  return toActivePlay(context, snapshot, cursor)
}

async function submitPlay(
  deps: VnPlayServiceDeps,
  turn: typeof resolveTurn,
  active: ActivePlay,
  request: SubmitVnPlayActionRequest
): Promise<ActivePlay> {
  const result = await turn(buildTurnInput(active, request), deps.resolveTurnDeps)
  const mode = vnModeFromNarration(result.narration)
  const beatText = latestBeatText(result, mode)
  const speakerId = mode === 'npc' ? request.socialSpeakerId ?? latestNpcSpeaker(result) : null
  const choices = await requireChoices(deps.completer, active.overview.mainCharacter, beatText)
  const turns = incrementStoryTurns(active.session)
  const cursor = advanceVnPlayCursor({
    cursor: active.cursor,
    actCount: actCount(active.overview),
    mode,
    beatId: `turn-${turns}`,
    beatText,
    speakerId,
    options: choices,
    completeAct: shouldCompleteAct(active.cursor.phase, turns)
  })
  writeVnPlayCursorOnSession(active.session, cursor)
  const snapshot = assemblePlaySnapshot({
    campaignId: active.campaignId,
    characterId: active.characterId,
    overview: active.overview,
    cast: active.cast,
    mode,
    beatText,
    speakerId,
    options: choices,
    scene: result.projections.scene,
    social: result.projections.social,
    phase: cursor.phase,
    storyComplete: cursor.storyComplete,
    actIndex: cursor.actIndex
  })
  return { ...active, snapshot, cursor }
}

function buildTurnInput(
  active: ActivePlay,
  request: SubmitVnPlayActionRequest
): Parameters<typeof resolveTurn>[0] {
  return {
    channel: 'play',
    campaignId: request.campaignId,
    characterId: active.characterId,
    text: request.text,
    ...(request.socialSpeakerId !== undefined
      ? { socialSpeakerId: request.socialSpeakerId }
      : {})
  }
}

function toActivePlay(
  context: PlayContext,
  snapshot: VnPlaySnapshot,
  cursor: VnPlayCursor
): ActivePlay {
  return {
    campaignId: context.campaignId,
    characterId: context.characterId,
    session: context.session,
    overview: context.loaded.overview,
    cast: context.loaded.cast,
    snapshot,
    cursor
  }
}

function actCount(overview: VnStoryOverview): number {
  return Math.max(1, overview.acts.length)
}

function safeProjections(): { scene?: SceneBlock[]; social?: SocialLine[] } {
  try {
    return { scene: projectScene(), social: projectSocial() }
  } catch {
    return {}
  }
}

async function requireChoices(
  completer: TextCompleter,
  mc: VnMainCharacterBrief,
  beatText: string
): Promise<[string, string]> {
  const result = await generateVnChoicePair(
    {
      personality: mc.personality,
      beatText,
      appearance: mc.appearance
    },
    completer
  )
  if (!result.ok) {
    throw new Error(result.errors.join('; ') || 'Choice generation failed')
  }
  return result.options
}

function requireOverview(
  handle: Parameters<typeof readCatalogEntry>[0],
  campaignId: string
): VnStoryOverview {
  const raw = readCatalogEntry(handle, 'vn_story', 'overview')?.payloadJson
  if (raw === undefined) {
    throw new Error(`Missing VN overview for ${campaignId}`)
  }
  const parsed: unknown = JSON.parse(raw)
  if (!isOverview(parsed)) {
    throw new Error(`Invalid VN overview for ${campaignId}`)
  }
  return parsed
}

function requireCast(handle: Parameters<typeof readCatalogEntry>[0]): VnStoryCastMember[] {
  const raw = readCatalogEntry(handle, 'vn_story', 'cast')?.payloadJson
  if (raw === undefined) return []
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null) return []
  const cast = (parsed as { cast?: unknown }).cast
  return Array.isArray(cast) ? (cast as VnStoryCastMember[]) : []
}

function isOverview(value: unknown): value is VnStoryOverview {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return typeof row.openingBeat === 'string' && typeof row.mainCharacter === 'object'
}

function latestBeatText(result: ResolveTurnResult, mode: VnPlaySnapshot['mode']): string {
  if (mode === 'npc') {
    const line = [...result.projections.social].reverse().find((row) => row.kind === 'npc')
    if (line !== undefined) return line.text
  }
  const scene = result.projections.scene[result.projections.scene.length - 1]
  if (scene !== undefined) return scene.text
  if (result.narration.kind === 'scene' && result.narration.status === 'persisted') {
    return result.narration.prose ?? ''
  }
  return ''
}

function latestNpcSpeaker(result: ResolveTurnResult): string | null {
  const line = [...result.projections.social].reverse().find((row) => row.kind === 'npc')
  return line?.speakerId ?? null
}
