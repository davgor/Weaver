import { readCampaignMeta, upsertCampaignMeta } from '../persistence/campaignMeta.js'
import type { CampaignMetaWriter } from '../persistence/campaignMeta.js'
import type { CampaignSession } from '../persistence/campaignSession.js'

/** Whether the player is still in the authored short story or in post-story freeplay. */
export type VnPlayPhase = 'story' | 'freeplay'

/**
 * Durable cursor describing exactly where a VN save is in play.
 *
 * Persisted as JSON under the `vn_play_cursor` campaign_meta key so mid-story
 * progress (act/beat, current speaker, pending player options) survives an app
 * restart, and so the Home screen can distinguish in-progress from
 * completed-but-continuing saves.
 */
export type VnPlayCursor = {
  campaignId: string
  characterId: string
  phase: VnPlayPhase
  storyComplete: boolean
  /** 1-based act index within the authored story. */
  actIndex: number
  beatId: string
  mode: 'scene' | 'npc'
  beatText: string
  speakerId: string | null
  options: [string, string]
  /** ISO-8601 timestamp of the last write. */
  updatedAt: string
}

/** campaign_meta key holding the serialized {@link VnPlayCursor}. */
export const VN_PLAY_CURSOR_META_KEY = 'vn_play_cursor'
/** Denormalized `'true' | 'false'` flag for cheap Home listing. */
export const VN_STORY_COMPLETE_META_KEY = 'story_complete'
/** Denormalized `'story' | 'freeplay'` phase for cheap Home listing. */
export const VN_PLAY_PHASE_META_KEY = 'play_phase'

export function serializeVnPlayCursor(cursor: VnPlayCursor): string {
  return JSON.stringify(cursor)
}

export function parseVnPlayCursor(raw: string): VnPlayCursor {
  const parsed: unknown = JSON.parse(raw)
  if (!isVnPlayCursor(parsed)) {
    throw new Error('Invalid VnPlayCursor payload')
  }
  return parsed
}

export function readVnPlayCursor(handle: CampaignMetaWriter): VnPlayCursor | undefined {
  const raw = readCampaignMeta(handle, VN_PLAY_CURSOR_META_KEY)
  return raw === undefined ? undefined : parseVnPlayCursor(raw)
}

export function writeVnPlayCursor(handle: CampaignMetaWriter, cursor: VnPlayCursor): void {
  upsertCampaignMeta(handle, VN_PLAY_CURSOR_META_KEY, serializeVnPlayCursor(cursor), cursor.updatedAt)
  upsertCampaignMeta(handle, VN_STORY_COMPLETE_META_KEY, storyCompleteFlag(cursor), cursor.updatedAt)
  upsertCampaignMeta(handle, VN_PLAY_PHASE_META_KEY, cursor.phase, cursor.updatedAt)
}

export function writeVnPlayCursorOnSession(
  session: Pick<CampaignSession, 'upsertMeta'>,
  cursor: VnPlayCursor
): void {
  session.upsertMeta(VN_PLAY_CURSOR_META_KEY, serializeVnPlayCursor(cursor))
  session.upsertMeta(VN_STORY_COMPLETE_META_KEY, storyCompleteFlag(cursor))
  session.upsertMeta(VN_PLAY_PHASE_META_KEY, cursor.phase)
}

export function readVnPlayCursorOnSession(
  session: Pick<CampaignSession, 'readMeta'>
): VnPlayCursor | undefined {
  const raw = session.readMeta(VN_PLAY_CURSOR_META_KEY)
  return raw === undefined ? undefined : parseVnPlayCursor(raw)
}

function storyCompleteFlag(cursor: VnPlayCursor): 'true' | 'false' {
  return cursor.storyComplete ? 'true' : 'false'
}

function isVnPlayCursor(value: unknown): value is VnPlayCursor {
  if (!isRecord(value)) {
    return false
  }
  return (
    hasStringFields(value) &&
    isPhase(value.phase) &&
    typeof value.storyComplete === 'boolean' &&
    typeof value.actIndex === 'number' &&
    isMode(value.mode) &&
    isSpeaker(value.speakerId) &&
    isOptionsPair(value.options)
  )
}

function hasStringFields(value: Record<string, unknown>): boolean {
  return (
    typeof value.campaignId === 'string' &&
    typeof value.characterId === 'string' &&
    typeof value.beatId === 'string' &&
    typeof value.beatText === 'string' &&
    typeof value.updatedAt === 'string'
  )
}

function isPhase(value: unknown): value is VnPlayPhase {
  return value === 'story' || value === 'freeplay'
}

function isMode(value: unknown): value is 'scene' | 'npc' {
  return value === 'scene' || value === 'npc'
}

function isSpeaker(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isOptionsPair(value: unknown): value is [string, string] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === 'string' &&
    typeof value[1] === 'string'
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
