import type { NarrationPeers } from './peers.js'
import type { ClaimValidationResult, FactualClaim } from './proseTypes.js'

export function validateClaims(
  claims: readonly FactualClaim[],
  peers: NarrationPeers
): ClaimValidationResult {
  const accepted: FactualClaim[] = []
  const rejected: Array<FactualClaim & { reason: string }> = []

  for (const claim of claims) {
    const reason = rejectionReason(claim, peers)
    if (reason === null) {
      accepted.push(claim)
    } else {
      rejected.push({ ...claim, reason })
    }
  }

  return { ok: rejected.length === 0, accepted, rejected }
}

function rejectionReason(claim: FactualClaim, peers: NarrationPeers): string | null {
  if (claim.kind === 'npcPresent') {
    return peers.npcs.getNpc(claim.npcId) === undefined
      ? `NPC not present: ${claim.npcId}`
      : null
  }
  if (claim.kind === 'itemExists') {
    return itemMissing(claim.itemId, peers) ? `Item does not exist: ${claim.itemId}` : null
  }
  return locationMissing(claim.name, peers) ? `Unknown location: ${claim.name}` : null
}

function itemMissing(itemId: string, peers: NarrationPeers): boolean {
  return peers.items !== undefined && !peers.items.hasItem(itemId)
}

function locationMissing(name: string, peers: NarrationPeers): boolean {
  return peers.locations !== undefined && !peers.locations.isKnownLocation(name)
}
