import type { VnPlayCursor } from './playCursor.js'

/**
 * Build the cursor for a freshly started VN save: act 1, story phase, the
 * opening scene beat with the initial player options.
 */
export function initialVnPlayCursor(input: {
  campaignId: string
  characterId: string
  openingBeat: string
  options: [string, string]
  now?: string
}): VnPlayCursor {
  return {
    campaignId: input.campaignId,
    characterId: input.characterId,
    phase: 'story',
    storyComplete: false,
    actIndex: 1,
    beatId: 'opening',
    mode: 'scene',
    beatText: input.openingBeat,
    speakerId: null,
    options: input.options,
    updatedAt: input.now ?? new Date().toISOString()
  }
}

/**
 * Produce the next cursor after a committed turn.
 *
 * Turn fields (mode/beat/speaker/options/updatedAt) always update. Act/phase
 * progression only applies while still in the authored story; once in freeplay
 * those stay fixed and only the turn fields move.
 */
export function advanceVnPlayCursor(input: {
  cursor: VnPlayCursor
  actCount: number
  mode: 'scene' | 'npc'
  beatId: string
  beatText: string
  speakerId: string | null
  options: [string, string]
  /** When true, treat this turn as completing the current act. */
  completeAct?: boolean
  now?: string
}): VnPlayCursor {
  const base: VnPlayCursor = {
    ...input.cursor,
    mode: input.mode,
    beatId: input.beatId,
    beatText: input.beatText,
    speakerId: input.speakerId,
    options: input.options,
    updatedAt: input.now ?? new Date().toISOString()
  }
  if (input.cursor.phase === 'freeplay') {
    return base
  }
  return applyActProgress(base, input.actCount, input.completeAct === true)
}

/** True once the player has left the authored story for post-story freeplay. */
export function isVnFreeplay(cursor: VnPlayCursor): boolean {
  return cursor.phase === 'freeplay' || cursor.storyComplete
}

function applyActProgress(
  cursor: VnPlayCursor,
  actCount: number,
  completeAct: boolean
): VnPlayCursor {
  if (!completeAct) {
    return cursor
  }
  if (cursor.actIndex >= actCount) {
    return { ...cursor, storyComplete: true, phase: 'freeplay', actIndex: actCount }
  }
  return { ...cursor, actIndex: cursor.actIndex + 1 }
}
