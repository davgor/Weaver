import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNpcStore,
  getNpc,
  hydrateNpcCombatTier,
  setNpcDefeatDisposition
} from './index.js'
import { seedNpc } from './testHelpers.js'

function resetCombatDispositionStore() {
  clearNpcStore()
}

describe('NPC civilian stats and defeat disposition', () => {
  beforeEach(resetCombatDispositionStore)

  it('defaults constructed NPCs to civilian HP without a combat tier', () => {
    const npc = seedNpc({ npcId: 'npc-civilian' })

    expect(npc.combatStats).toEqual({
      kind: 'civilian',
      maxHp: 10,
      currentHp: 10
    })
  })

  it('hydrates combat-tier HP through the shared CharacterEngine model', () => {
    seedNpc({
      npcId: 'npc-guard',
      abilityScores: { Body: 14, Agility: 12, Mind: 10, Presence: 10 }
    })

    const npc = hydrateNpcCombatTier({
      npcId: 'npc-guard',
      tierId: 'trained-guard',
      level: 2,
      hitDie: 8,
      rolls: [8, 5],
      armorClass: 13,
      attackBonus: 4
    })

    expect(npc.combatStats).toMatchObject({
      kind: 'combatant',
      tierId: 'trained-guard',
      maxHp: 15,
      currentHp: 15,
      armorClass: 13,
      attackBonus: 4
    })
  })

  it('exposes CombatEngine-facing defeat disposition transitions distinct from death', () => {
    seedNpc({ npcId: 'npc-defeated' })

    const yielded = setNpcDefeatDisposition({
      npcId: 'npc-defeated',
      disposition: 'yielded',
      source: { encounterId: 'encounter-1', actorId: 'combat-engine' }
    })
    const executed = setNpcDefeatDisposition({
      npcId: 'npc-defeated',
      disposition: 'executed',
      source: { encounterId: 'encounter-1', actorId: 'combat-engine' }
    })

    expect(yielded.defeatDisposition).toMatchObject({ disposition: 'yielded', dead: false })
    expect(executed.defeatDisposition).toMatchObject({ disposition: 'executed', dead: false })
    expect(getNpc('npc-defeated')?.defeatDisposition?.source.actorId).toBe('combat-engine')
  })
})
