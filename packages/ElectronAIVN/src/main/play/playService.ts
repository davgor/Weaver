import {
  generateVnChoicePair,
  openCampaign,
  openCampaignSession,
  readCatalogEntry,
  resolveTurn,
  type CampaignSession,
  type ResolveTurnDeps,
  type ResolveTurnResult,
  type VnMainCharacterBrief,
  type VnStoryCastMember,
  type VnStoryOverview
} from '@weaver/dm-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import type {
  SubmitVnPlayActionRequest,
  VnPlaySnapshot
} from '../../shared/play/types.js'
import { vnModeFromNarration } from '../../shared/play/vnMode.js'
import { resolveStoryPaths } from '../story/storyDisk.js'
import { buildPlayPlaceholders } from './buildPlayPlaceholders.js'

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
}

type ActivePlay = {
  campaignId: string
  characterId: string
  session: CampaignSession
  overview: VnStoryOverview
  cast: VnStoryCastMember[]
  snapshot: VnPlaySnapshot
}

export function createVnPlayService(deps: VnPlayServiceDeps): VnPlayService {
  let active: ActivePlay | null = null
  const turn = deps.resolveTurnFn ?? resolveTurn
  return {
    open: async (campaignId) => {
      active?.session.close()
      active = await openPlay(deps, campaignId)
      return active.snapshot
    },
    submitAction: async (request) => {
      if (active === null || active.campaignId !== request.campaignId) {
        throw new Error('No active VN play session for this campaign')
      }
      active = await submitPlay(deps, turn, active, request)
      return active.snapshot
    }
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
  const choices = await requireChoices(
    deps.completer,
    loaded.overview.mainCharacter,
    loaded.overview.openingBeat
  )
  const snapshot = buildSnapshot({
    campaignId,
    characterId,
    overview: loaded.overview,
    cast: loaded.cast,
    mode: 'scene',
    beatText: loaded.overview.openingBeat,
    speakerId: null,
    options: choices,
    scene: [
      {
        id: 'opening',
        text: loaded.overview.openingBeat,
        at: new Date().toISOString()
      }
    ],
    social: []
  })
  return {
    campaignId,
    characterId,
    session,
    overview: loaded.overview,
    cast: loaded.cast,
    snapshot
  }
}

async function submitPlay(
  deps: VnPlayServiceDeps,
  turn: typeof resolveTurn,
  active: ActivePlay,
  request: SubmitVnPlayActionRequest
): Promise<ActivePlay> {
  const result = await turn(
    {
      channel: 'play',
      campaignId: request.campaignId,
      characterId: active.characterId,
      text: request.text,
      ...(request.socialSpeakerId !== undefined
        ? { socialSpeakerId: request.socialSpeakerId }
        : {})
    },
    deps.resolveTurnDeps
  )
  const mode = vnModeFromNarration(result.narration)
  const beatText = latestBeatText(result, mode)
  const speakerId = mode === 'npc' ? request.socialSpeakerId ?? latestNpcSpeaker(result) : null
  const choices = await requireChoices(deps.completer, active.overview.mainCharacter, beatText)
  const snapshot = buildSnapshot({
    campaignId: active.campaignId,
    characterId: active.characterId,
    overview: active.overview,
    cast: active.cast,
    mode,
    beatText,
    speakerId,
    options: choices,
    scene: result.projections.scene,
    social: result.projections.social
  })
  return { ...active, snapshot }
}

function buildSnapshot(input: {
  campaignId: string
  characterId: string
  overview: VnStoryOverview
  cast: VnStoryCastMember[]
  mode: VnPlaySnapshot['mode']
  beatText: string
  speakerId: string | null
  options: [string, string]
  scene: VnPlaySnapshot['scene']
  social: VnPlaySnapshot['social']
}): VnPlaySnapshot {
  return {
    campaignId: input.campaignId,
    characterId: input.characterId,
    mode: input.mode,
    beatText: input.beatText,
    speakerName: speakerName(input.cast, input.speakerId),
    options: input.options,
    freeText: '',
    placeholders: buildPlayPlaceholders({
      campaignId: input.campaignId,
      mainCharacter: input.overview.mainCharacter,
      beatText: input.beatText,
      mode: input.mode,
      speakerId: input.speakerId,
      cast: input.cast
    }),
    scene: input.scene,
    social: input.social,
    mainCharacter: input.overview.mainCharacter,
    cast: input.cast
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

function speakerName(cast: VnStoryCastMember[], speakerId: string | null): string | null {
  if (speakerId === null) return null
  return cast.find((member) => member.npcId === speakerId)?.displayName ?? speakerId
}
