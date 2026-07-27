import type { CampaignSession, VnPlayPhase } from '@weaver/dm-engine'

/** campaign_meta key holding the running count of committed story turns. */
export const VN_STORY_TURNS_META_KEY = 'vn_story_turns'

type MetaSession = Pick<CampaignSession, 'readMeta' | 'upsertMeta'>

/**
 * Bump the persisted story-turn counter and return the new value. Used as a
 * deterministic stand-in for DM-signalled act boundaries until the DM emits them.
 */
export function incrementStoryTurns(session: MetaSession): number {
  const previous = readTurns(session)
  const next = previous + 1
  session.upsertMeta(VN_STORY_TURNS_META_KEY, String(next))
  return next
}

/**
 * Deterministic act-boundary heuristic: while still in the authored story, treat
 * every second committed turn (2 turns per act) as completing the current act.
 */
export function shouldCompleteAct(phase: VnPlayPhase, turns: number): boolean {
  return phase === 'story' && turns % 2 === 0
}

function readTurns(session: MetaSession): number {
  const raw = session.readMeta(VN_STORY_TURNS_META_KEY)
  if (raw === undefined) return 0
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : 0
}
