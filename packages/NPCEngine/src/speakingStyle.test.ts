import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcStore, selectSocialResponders, updateNpcSpeakingStyle } from './index.js'
import { seedNpc } from './testHelpers.js'

describe('NPC speaking style and selective replies', () => {
  beforeEach(() => {
    clearNpcStore()
  })

  it('stores stable speaking-style samples for NarrationEngine grounding', () => {
    const npc = seedNpc({
      npcId: 'npc-speaker',
      speakingStyle: { tone: 'dry', vocabulary: ['precise', 'brief'] }
    })

    const updated = updateNpcSpeakingStyle({
      npcId: npc.npcId,
      speakingStyle: { tone: 'dry', vocabulary: ['precise', 'brief'] }
    })

    expect(updated.speakingStyle).toEqual({ tone: 'dry', vocabulary: ['precise', 'brief'] })
  })

  it('deterministically selects addressed and context-relevant responders', () => {
    seedNpc({ npcId: 'npc-a' })
    seedNpc({ npcId: 'npc-b', factionIds: ['guild'] })
    seedNpc({ npcId: 'npc-c', factionIds: ['watch'] })

    const request = {
      presentNpcIds: ['npc-a', 'npc-b', 'npc-c'],
      addressedTarget: 'npc-a',
      recentContext: { mentionedNpcIds: ['npc-c'], mentionedFactionIds: ['guild'] }
    }

    expect(selectSocialResponders(request)).toEqual(['npc-a', 'npc-b', 'npc-c'])
    expect(selectSocialResponders(request)).toEqual(['npc-a', 'npc-b', 'npc-c'])
  })

  it('does not select non-speaking NPCs for social replies', () => {
    seedNpc({ npcId: 'npc-a' })
    seedNpc({ npcId: 'npc-statue', speciesKind: 'construct' })

    expect(selectSocialResponders({ presentNpcIds: ['npc-statue', 'npc-a'] })).toEqual(['npc-a'])
  })
})
