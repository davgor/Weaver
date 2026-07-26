import { beforeEach, describe, expect, it } from 'vitest'
import {
  addNpcToFaction,
  clearFactionStore,
  clearNpcStore,
  createFaction,
  getFactionRelation,
  getNpc,
  getReputationStanding,
  listCharacterReputationStandings,
  setFactionRelation,
  updateReputation
} from './index.js'
import { seedNpc } from './testHelpers.js'

describe('NPC factions and reputation', () => {
  beforeEach(() => {
    clearNpcStore()
    clearFactionStore()
  })

  it('creates faction records with NPC membership links', () => {
    seedNpc({ npcId: 'npc-member' })
    createFaction({ factionId: 'guild', name: 'River Guild' })

    const faction = addNpcToFaction({ factionId: 'guild', npcId: 'npc-member', role: 'factor' })

    expect(faction.memberships).toEqual([{ npcId: 'npc-member', role: 'factor' }])
    expect(getNpc('npc-member')?.factionIds).toEqual(['guild'])
  })

  it('stores and queries faction-to-faction relations for a pair', () => {
    createFaction({ factionId: 'guild', name: 'River Guild' })
    createFaction({ factionId: 'watch', name: 'Town Watch' })

    setFactionRelation({ sourceFactionId: 'guild', targetFactionId: 'watch', relation: 'allied' })

    expect(getFactionRelation('guild', 'watch')).toEqual({
      sourceFactionId: 'guild',
      targetFactionId: 'watch',
      relation: 'allied'
    })
    expect(getFactionRelation('watch', 'guild')?.relation).toBe('allied')
  })

  it('mutates per-character reputation only through package APIs', () => {
    createFaction({ factionId: 'guild', name: 'River Guild' })
    createFaction({ factionId: 'watch', name: 'Town Watch' })
    updateReputation({
      characterId: 'pc-1',
      factionId: 'guild',
      delta: 5,
      provenance: { eventId: 'quest-helped-guild' }
    })
    updateReputation({
      characterId: 'pc-1',
      factionId: 'watch',
      delta: -2,
      provenance: { eventId: 'angered-watch' }
    })

    expect(getReputationStanding('pc-1', 'guild')?.score).toBe(5)
    expect(listCharacterReputationStandings('pc-1').map((standing) => standing.factionId)).toEqual([
      'guild',
      'watch'
    ])
  })
})
