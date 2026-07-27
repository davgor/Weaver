import type { TurnNarrationOutcome } from '@weaver/dm-engine'
import type { VnPlayMode } from './types.js'

/** Mode comes from DMEngine narration kind — not ad-hoc UI guessing. */
export function vnModeFromNarration(narration: Pick<TurnNarrationOutcome, 'kind'>): VnPlayMode {
  return narration.kind === 'social' ? 'npc' : 'scene'
}

export function vnModeFromProjection(input: {
  narrationKind?: TurnNarrationOutcome['kind']
  socialSpeakerId?: string
}): VnPlayMode {
  if (input.narrationKind !== undefined) {
    return vnModeFromNarration({ kind: input.narrationKind })
  }
  return input.socialSpeakerId !== undefined ? 'npc' : 'scene'
}
