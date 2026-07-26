import { beforeEach, describe, expect, it } from 'vitest'
import { setCampaignDay, setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import {
  clearNpcStore,
  constructNpc,
  getNpc,
  getNpcLocation,
  npcEngine,
  setNpcLocation
} from '../index.js'

/**
 * Pins NPC current-location ownership through published helpers + endpoints.
 *
 * Spawn/home stays on NpcRecord.regionId / civilizationId from construction;
 * quest-giver movement uses setNpcLocation without rewriting those fields.
 */
describe('NPCEngine location ownership contract', () => {
  beforeEach(() => {
    clearNpcStore()
    clearNpcPlaceholderStore()
    setCampaignRaceRoster('campaign-npc-location-contract', [{ raceId: 'human', name: 'Human' }])
    setCampaignDay('campaign-npc-location-contract', 5)
  })

  it('stores opaque region/place ids and keeps spawn home distinct from current location', async () => {
    const [slot] = ensureNpcPlaceholders({
      worldId: 'world-npc-location-contract',
      civilizationId: 'civ-home',
      regionId: 'region-home',
      roleHints: ['merchant']
    })
    const npc = constructNpc({
      campaignId: 'campaign-npc-location-contract',
      worldId: 'world-npc-location-contract',
      npcId: 'npc-contract-loc',
      placeholderSlotId: slot.slotId,
      raceId: 'human',
      alignment: 'neutral',
      temperament: 'wary',
      abilityScores: { Body: 10, Agility: 10, Mind: 12, Presence: 11 }
    })

    expect(npc.regionId).toBe('region-home')
    expect(getNpcLocation('npc-contract-loc')?.placeId).toBe('civ-home')

    const moved = setNpcLocation({
      npcId: 'npc-contract-loc',
      campaignId: 'campaign-npc-location-contract',
      regionId: 'opaque-region-id',
      placeId: 'opaque-place-id',
      locationKind: 'dungeon'
    })
    expect(moved.updatedDay).toBe(5)
    expect(getNpcLocation('npc-contract-loc')).toEqual(moved)
    expect(getNpc('npc-contract-loc')?.regionId).toBe('region-home')

    const viaEndpoint = await npcEngine.call('getNpcLocation', {
      npcId: 'npc-contract-loc'
    })
    expect(viaEndpoint).toEqual(moved)

    await npcEngine.call('clearNpcLocation', { npcId: 'npc-contract-loc' })
    expect(getNpcLocation('npc-contract-loc')).toBeNull()
  })
})
