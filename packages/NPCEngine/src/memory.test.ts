import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcStore, appendNpcMemory, appendWorldFact, queryNpcGroundingContext } from './index.js'
import { seedNpc } from './testHelpers.js'

function resetMemoryStore() {
  clearNpcStore()
}

describe('NPC memory isolation', () => {
  beforeEach(resetMemoryStore)

  it('keeps each NPC private memory keyed only to that NPC', () => {
    seedNpc({ npcId: 'npc-a', regionId: 'north' })
    seedNpc({ npcId: 'npc-b', regionId: 'north' })
    appendNpcMemory({
      npcId: 'npc-a',
      text: 'Saw the player bribe a guard.',
      provenance: { eventId: 'event-a', sceneId: 'scene-a' }
    })
    appendNpcMemory({
      npcId: 'npc-b',
      text: 'Found a sealed courier pouch.',
      provenance: { eventId: 'event-b' }
    })

    const context = queryNpcGroundingContext({ npcId: 'npc-a' })

    expect(context.privateMemories.map((memory) => memory.text)).toEqual([
      'Saw the player bribe a guard.'
    ])
    expect(context.privateMemories[0]?.provenance).toEqual({
      eventId: 'event-a',
      sceneId: 'scene-a'
    })
  })

  it('includes only world facts tagged to the NPC region or factions', () => {
    seedNpc({ npcId: 'npc-a', regionId: 'north', factionIds: ['guild'] })
    appendWorldFact({
      factId: 'fact-region',
      text: 'The north gate is damaged.',
      regionIds: ['north'],
      provenance: { eventId: 'region-event' }
    })
    appendWorldFact({
      factId: 'fact-faction',
      text: 'The guild plans a vote.',
      factionIds: ['guild'],
      provenance: { eventId: 'faction-event' }
    })
    appendWorldFact({
      factId: 'fact-other',
      text: 'The south quarry collapsed.',
      regionIds: ['south'],
      provenance: { eventId: 'other-event' }
    })
    appendWorldFact({ factId: 'fact-untagged', text: 'Unscoped rumor.', provenance: { eventId: 'leak' } })

    const facts = queryNpcGroundingContext({ npcId: 'npc-a' }).worldFacts

    expect(facts.map((fact) => fact.factId)).toEqual(['fact-region', 'fact-faction'])
  })
})
