import { describe, expect, it } from 'vitest'
import { buildCharacterFacts } from './characterFacts.js'
import type { CharacterIdentityGroundingApi } from './types.js'

describe('buildCharacterFacts', () => {
  it('prunes empty optional facts when the character has no selections yet', () => {
    expect(buildCharacterFacts('pc-1', emptyCharacterApi())).toEqual({})
  })

  it('formats selected identity, loadout quantities, actions, and companions', () => {
    const facts = buildCharacterFacts('pc-1', {
      getCharacterIdentity: () => ({
        race: { name: 'Elf', lore: 'forest kin' },
        background: {
          name: 'Outlander',
          description: 'Wilderness survivor',
          personalStory: 'Keeps a moonlit oath.'
        }
      }),
      getCharacterArchetype: () => 'Ranger',
      getCharacterStartingLoadout: () => ({
        archetype: 'Ranger',
        items: [
          { name: 'Longbow', quantity: 1 },
          { templateId: 'ration', quantity: 3 },
          { quantity: 2 }
        ],
        actionIds: ['ranged-shot', 'hide']
      }),
      getCompanionOnboardingStatus: () => 'complete',
      listCompanions: () => [
        { name: 'Lyra', archetype: 'Scout' },
        { name: 'Pip' }
      ]
    })

    expect(facts).toEqual({
      race: 'Elf',
      raceLore: 'forest kin',
      background: 'Outlander',
      backgroundDescription: 'Wilderness survivor',
      personalStory: 'Keeps a moonlit oath.',
      archetype: 'Ranger',
      gear: 'Longbow, ration x3',
      knownActions: 'ranged-shot, hide',
      companionStatus: 'complete',
      companions: 'Lyra the Scout, Pip'
    })
  })
})

function emptyCharacterApi(): CharacterIdentityGroundingApi {
  return {
    getCharacterIdentity: () => undefined,
    getCharacterArchetype: () => undefined,
    getCharacterStartingLoadout: () => undefined,
    getCompanionOnboardingStatus: () => undefined,
    listCompanions: () => []
  }
}
