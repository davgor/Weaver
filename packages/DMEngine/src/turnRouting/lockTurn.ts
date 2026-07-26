import { TurnRoutingError } from './types.js'

const activeLocks = new Set<string>()

export function lockTurn(campaignId: string, characterId: string): () => void {
  const key = toLockKey(campaignId, characterId)
  if (activeLocks.has(key)) {
    throw new TurnRoutingError(
      'DM_TURN_LOCK_CONFLICT',
      `Turn already in progress for campaign ${campaignId} and character ${characterId}`
    )
  }
  activeLocks.add(key)
  return () => {
    activeLocks.delete(key)
  }
}

function toLockKey(campaignId: string, characterId: string): string {
  return `${campaignId}:${characterId}`
}
