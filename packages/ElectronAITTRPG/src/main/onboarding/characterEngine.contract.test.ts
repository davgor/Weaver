import { beforeEach, describe, expect, it } from 'vitest'
import {
  assignStandardArrayAbilityScores,
  clearCompanionStore,
  clearStartingLoadoutStore,
  confirmRolledAbilityScores,
  createCompanion,
  getCharacterStartingLoadout,
  pointBuyAbilityScores,
  rollAbilityScoreDraft,
  setCampaignBackgroundRoster,
  setCampaignRaceRoster
} from '@weaver/character-engine'
import {
  beginOnboarding,
  clearOnboardingStore,
  createLiveCharacterPorts,
  createOnboardingService,
  saveBackgroundStep,
  saveCompanionsStep,
  saveEquipmentStep,
  saveMechanicalSetupStep,
  saveRaceStep,
  type OnboardingDmPorts,
  type OnboardingNarrationPorts
} from './onboardingService.js'

const CAMPAIGN_ID = `onboarding-ce-${Date.now()}`
const CHARACTER_ID = `onboarding-pc-ce-${Date.now()}`

describe('onboarding CharacterEngine contract (022/029/026/030)', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearOnboardingStore()
    seedCampaignRosters()
  })

  it('exercises ability generation APIs', () => {
    expect(pointBuyAbilityScores({ Body: 10, Agility: 10, Mind: 10, Presence: 10 })).toEqual({
      Body: 10,
      Agility: 10,
      Mind: 10,
      Presence: 10
    })
    const scores = assignStandardArrayAbilityScores({
      Body: 14,
      Agility: 12,
      Mind: 10,
      Presence: 8
    })
    const rolled = rollAbilityScoreDraft(() => 4)
    expect(confirmRolledAbilityScores(rolled).Body).toBeGreaterThan(0)
    expect(scores.Body).toBe(14)
  })

  it('walks race, background, loadout, and companion APIs through onboarding ports', () => {
    const service = createOnboardingService({
      character: createLiveCharacterPorts(),
      dm: unusedDmPorts(),
      narration: unusedNarrationPorts()
    })
    walkCharacterOnboarding(service)
    expect(getCharacterStartingLoadout(CHARACTER_ID)?.archetype).toBe('Ranger')
    expect(createCompanion).toBeTypeOf('function')
  })
})

function walkCharacterOnboarding(service: ReturnType<typeof createOnboardingService>): void {
  beginOnboarding(service, {
    campaignId: CAMPAIGN_ID,
    characterId: CHARACTER_ID,
    characterName: 'Contract PC'
  })
  saveMechanicalSetupStep(service, {
    campaignId: CAMPAIGN_ID,
    characterId: CHARACTER_ID,
    archetype: 'Ranger',
    method: 'standard_array',
    scores: { Body: 14, Agility: 12, Mind: 10, Presence: 8 }
  })
  saveRaceStep(service, { campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID, raceId: 'elf' })
  saveBackgroundStep(service, {
    campaignId: CAMPAIGN_ID,
    characterId: CHARACTER_ID,
    backgroundId: 'outlander'
  })
  saveEquipmentStep(service, { campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID })
  saveCompanionsStep(service, {
    campaignId: CAMPAIGN_ID,
    characterId: CHARACTER_ID,
    action: 'create',
    name: 'Lyra',
    archetype: 'Rogue'
  })
}

function seedCampaignRosters(): void {
  setCampaignRaceRoster(CAMPAIGN_ID, [{ raceId: 'elf', name: 'Elf', lore: 'forest kin' }])
  setCampaignBackgroundRoster(CAMPAIGN_ID, [
    {
      backgroundId: 'outlander',
      name: 'Outlander',
      description: 'wilderness survivor'
    }
  ])
}

function unusedDmPorts(): OnboardingDmPorts {
  const error = () => {
    throw new Error('DM ports are not used in this contract test.')
  }
  return {
    startGuidedIdentity: error,
    submitGuidedIdentityMessage: async () => error(),
    generateOpeningScene: async () => error(),
    confirmOpeningScene: error,
    getGuidedCreationState: () => undefined
  }
}

function unusedNarrationPorts(): OnboardingNarrationPorts {
  return {
    narration: {
      generateGuidedIdentityReply: async () => ({ ok: false, errors: [] }),
      fillAndValidate: async () => ({ ok: false, filled: {}, errors: [] })
    },
    completer: { completeText: async () => ({ text: 'unused', backend: 'test' }) },
    characterGrounding: {
      getCharacterIdentity: () => undefined,
      getCharacterArchetype: () => undefined,
      getCharacterStartingLoadout: () => undefined,
      getCompanionOnboardingStatus: () => undefined,
      listCompanions: () => []
    }
  }
}
