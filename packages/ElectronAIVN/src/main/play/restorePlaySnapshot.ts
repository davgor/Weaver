import type { SceneBlock, SocialLine } from '@weaver/narration-engine'
import type {
  VnPlayCursor,
  VnPlayPhase,
  VnStoryCastMember,
  VnStoryOverview
} from '@weaver/dm-engine'
import type { VnPlayMode, VnPlaySnapshot } from '../../shared/play/types.js'
import { buildPlayPlaceholders } from './buildPlayPlaceholders.js'

export type AssemblePlaySnapshotInput = {
  campaignId: string
  characterId: string
  overview: VnStoryOverview
  cast: VnStoryCastMember[]
  mode: VnPlayMode
  beatText: string
  speakerId: string | null
  options: [string, string]
  scene: SceneBlock[]
  social: SocialLine[]
  phase: VnPlayPhase
  storyComplete: boolean
  actIndex: number
}

/** Assemble a renderer snapshot from already-resolved turn fields plus story progress. */
export function assemblePlaySnapshot(input: AssemblePlaySnapshotInput): VnPlaySnapshot {
  return {
    campaignId: input.campaignId,
    characterId: input.characterId,
    mode: input.mode,
    beatText: input.beatText,
    speakerName: speakerName(input.cast, input.speakerId),
    speakerId: input.speakerId,
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
    cast: input.cast,
    phase: input.phase,
    storyComplete: input.storyComplete,
    actIndex: input.actIndex
  }
}

export type RestorePlaySnapshotInput = {
  cursor: VnPlayCursor
  overview: VnStoryOverview
  cast: VnStoryCastMember[]
  scene?: SceneBlock[]
  social?: SocialLine[]
}

/**
 * Rebuild a play snapshot from a persisted cursor after a restart. The cursor is
 * the source of truth for the pending options/beat/phase; scene/social history is
 * taken from the reopened narration projections when available, otherwise a single
 * scene block is synthesized from the cursor beat so the stage is never blank.
 */
export function restorePlaySnapshot(input: RestorePlaySnapshotInput): VnPlaySnapshot {
  const { cursor } = input
  return assemblePlaySnapshot({
    campaignId: cursor.campaignId,
    characterId: cursor.characterId,
    overview: input.overview,
    cast: input.cast,
    mode: cursor.mode,
    beatText: cursor.beatText,
    speakerId: cursor.speakerId,
    options: cursor.options,
    scene: restoreScene(cursor, input.scene),
    social: input.social ?? [],
    phase: cursor.phase,
    storyComplete: cursor.storyComplete,
    actIndex: cursor.actIndex
  })
}

function restoreScene(cursor: VnPlayCursor, scene: SceneBlock[] | undefined): SceneBlock[] {
  if (scene !== undefined && scene.length > 0) {
    return scene
  }
  if (cursor.mode === 'npc') {
    return scene ?? []
  }
  return [{ id: cursor.beatId, text: cursor.beatText, at: cursorTimestamp(cursor) }]
}

function cursorTimestamp(cursor: VnPlayCursor): number {
  const parsed = Date.parse(cursor.updatedAt)
  return Number.isNaN(parsed) ? Date.now() : parsed
}

function speakerName(cast: VnStoryCastMember[], speakerId: string | null): string | null {
  if (speakerId === null) return null
  return cast.find((member) => member.npcId === speakerId)?.displayName ?? speakerId
}
