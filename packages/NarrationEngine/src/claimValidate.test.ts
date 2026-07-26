import { describe, expect, it } from 'vitest'
import { validateClaims } from './claimValidate.js'
import type { NarrationPeers } from './peers.js'
import type { FactualClaim } from './proseTypes.js'

describe('validateClaims', () => {
  it('accepts claims that match injected peer facts', () => {
    const peers = samplePeers({ npcIds: ['npc-mira'], items: ['item-lantern'], places: ['Riverbend'] })
    const claims: FactualClaim[] = [
      { kind: 'npcPresent', npcId: 'npc-mira' },
      { kind: 'itemExists', itemId: 'item-lantern' },
      { kind: 'locationName', name: 'Riverbend' }
    ]

    const result = validateClaims(claims, peers)
    expect(result.ok).toBe(true)
    expect(result.accepted).toEqual(claims)
    expect(result.rejected).toEqual([])
  })

  it('rejects NPC presence claims when the peer lookup has no such NPC', () => {
    const peers = samplePeers({ npcIds: [], items: [], places: [] })
    const result = validateClaims([{ kind: 'npcPresent', npcId: 'npc-ghost' }], peers)

    expect(result.ok).toBe(false)
    expect(result.rejected).toEqual([
      { kind: 'npcPresent', npcId: 'npc-ghost', reason: 'NPC not present: npc-ghost' }
    ])
  })
})

function samplePeers(input: {
  npcIds: string[]
  items: string[]
  places: string[]
}): NarrationPeers {
  const npcSet = new Set(input.npcIds)
  const itemSet = new Set(input.items)
  const placeSet = new Set(input.places.map((name) => name.toLowerCase()))
  return {
    llm: { completeText: async () => ({ text: '', backend: 'cpu' }) },
    npcs: {
      getNpc: (npcId) => (npcSet.has(npcId) ? { npcId } : undefined)
    },
    items: { hasItem: (itemId) => itemSet.has(itemId) },
    locations: { isKnownLocation: (name) => placeSet.has(name.toLowerCase()) }
  }
}
