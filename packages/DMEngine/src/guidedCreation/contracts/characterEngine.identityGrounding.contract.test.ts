import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCompanionStore,
  clearStartingLoadoutStore,
  createCompanion,
  getCharacterArchetype,
  getCharacterIdentity,
  getCharacterStartingLoadout,
  getCompanionOnboardingStatus,
  listCompanions,
  selectBackground,
  selectRace,
  selectStartingLoadout,
  setCampaignBackgroundRoster,
  setCampaignRaceRoster
} from '@weaver/character-engine'
import { buildCharacterFacts } from '../characterFacts.js'

describe('CharacterEngine identity grounding contract', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
  })

  it('exposes chosen race, background, archetype, loadout, and companion facts', () => {
    const campaignId = 'contract-campaign'
    const characterId = 'contract-pc'
    setCampaignRaceRoster(campaignId, [
      { raceId: 'elf', name: 'elf', lore: 'forest kin' }
    ])
    setCampaignBackgroundRoster(campaignId, [
      {
        backgroundId: 'outlander',
        name: 'outlander',
        description: 'wilderness survivor'
      }
    ])
    selectRace({ campaignId, characterId, raceId: 'elf' })
    selectBackground({ campaignId, characterId, backgroundId: 'outlander' })
    selectStartingLoadout(characterId, 'Ranger')
    createCompanion({
      ownerCharacterId: characterId,
      campaignId,
      name: 'Lyra',
      archetype: 'Ranger'
    })

    const facts = buildCharacterFacts(characterId, {
      getCharacterIdentity,
      getCharacterArchetype,
      getCharacterStartingLoadout,
      getCompanionOnboardingStatus,
      listCompanions
    })

    expect(facts).toMatchObject({
      race: 'elf',
      background: 'outlander',
      archetype: 'Ranger',
      companionStatus: 'completed'
    })
    expect(facts.gear).toContain('longbow')
    expect(facts.companions).toContain('Lyra')
  })
})
