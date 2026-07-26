import { describe, expect, it } from 'vitest'
import { validateProse } from './proseValidate.js'
import type { NarrationPeers } from './peers.js'
import type { FactualClaim } from './proseTypes.js'

describe('validateProse', () => {
  it('combines claim validation with tone guarding in one pass', () => {
    const peers = samplePeers({ npcIds: ['npc-guard'], items: [], places: [] })
    const claims: FactualClaim[] = [{ kind: 'npcPresent', npcId: 'npc-guard' }]
    const prose = 'The beholder waits beside the guard.'

    const result = validateProse(prose, claims, peers)

    expect(result.ok).toBe(true)
    expect(result.prose).toBe('The eye tyrant waits beside the guard.')
    expect(result.rewrites).toEqual([{ from: 'beholder', to: 'eye tyrant' }])
    expect(result.toneViolations).toEqual([])
    expect(result.accepted).toEqual(claims)
  })

  it('fails when tone violations remain after terminology scrubbing', () => {
    const peers = samplePeers({ npcIds: [], items: [], places: [] })
    const result = validateProse('Roll a d20 for initiative order.', [], peers)

    expect(result.ok).toBe(false)
    expect(result.toneViolations).toEqual(expect.arrayContaining(['d20', 'initiative order']))
  })

  it('fails when factual claims contradict peer data even if tone is clean', () => {
    const peers = samplePeers({ npcIds: [], items: [], places: [] })
    const claims: FactualClaim[] = [{ kind: 'npcPresent', npcId: 'npc-missing' }]

    const result = validateProse('A quiet street.', claims, peers)

    expect(result.ok).toBe(false)
    expect(result.rejected).toEqual([
      { kind: 'npcPresent', npcId: 'npc-missing', reason: 'NPC not present: npc-missing' }
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
