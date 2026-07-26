import { beforeEach, describe, expect, it } from 'vitest'
import {
  computeMaxHp,
  getAbilityModifier,
  listCampaignRaces,
  setCampaignRaceRoster
} from '@weaver/character-engine'
import { clearNpcStore, constructNpc, hydrateNpcCombatTier } from '../index.js'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'

describe('NPCEngine -> CharacterEngine contract', () => {
  beforeEach(() => {
    clearNpcStore()
    clearNpcPlaceholderStore()
    setCampaignRaceRoster('campaign-character-contract', [{ raceId: 'dwarf', name: 'Dwarf' }])
  })

  it('uses the real race roster and ability modifier APIs during construction', () => {
    const [slot] = ensureNpcPlaceholders(placeholderInput())

    const npc = constructNpc({
      campaignId: 'campaign-character-contract',
      worldId: 'world-character-contract',
      npcId: 'npc-character-contract',
      placeholderSlotId: slot.slotId,
      raceId: 'dwarf',
      alignment: 'lawful',
      temperament: 'stubborn',
      abilityScores: { Body: 15, Agility: 9, Mind: 12, Presence: 10 }
    })

    expect(listCampaignRaces('campaign-character-contract')).toEqual([
      { raceId: 'dwarf', name: 'Dwarf', lore: '' }
    ])
    expect(npc.identity.race.name).toBe('Dwarf')
    expect(npc.abilityModifiers.Body).toBe(getAbilityModifier(15))
  })

  it('hydrates combat HP from CharacterEngine computeMaxHp', () => {
    seedCharacterContractNpc()

    const npc = hydrateNpcCombatTier({
      npcId: 'npc-hp-contract',
      tierId: 'veteran',
      level: 3,
      hitDie: 10,
      rolls: [10, 6, 5]
    })

    expect(npc.combatStats.maxHp).toBe(computeMaxHp(10, 3, 2, [10, 6, 5]))
  })
})

function seedCharacterContractNpc() {
  const [slot] = ensureNpcPlaceholders(placeholderInput())
  constructNpc({
    campaignId: 'campaign-character-contract',
    worldId: 'world-character-contract',
    npcId: 'npc-hp-contract',
    placeholderSlotId: slot.slotId,
    raceId: 'dwarf',
    alignment: 'neutral',
    temperament: 'steady',
    abilityScores: { Body: 14, Agility: 10, Mind: 10, Presence: 10 }
  })
}

function placeholderInput() {
  return {
    worldId: 'world-character-contract',
    civilizationId: 'civ-character-contract',
    regionId: 'region-character-contract',
    roleHints: ['guard'] as const
  }
}
