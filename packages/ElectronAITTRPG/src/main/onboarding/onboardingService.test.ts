import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AbilityScores } from '@weaver/character-engine'
import {
  beginOnboarding,
  clearOnboardingStore,
  createOnboardingService,
  goBackOnboarding,
  saveBackgroundStep,
  saveCompanionsStep,
  saveEquipmentStep,
  saveMechanicalSetupStep,
  saveRaceStep,
  type OnboardingCharacterPorts,
  type OnboardingDmPorts,
  type OnboardingNarrationPorts
} from './onboardingService.js'

const CAMPAIGN_ID = 'onboarding-campaign'
const CHARACTER_ID = 'onboarding-pc'

const STANDARD_SCORES: AbilityScores = {
  Body: 14,
  Agility: 12,
  Mind: 10,
  Presence: 8
}

const ROLL_DETAILS = {
  Body: [6, 5, 4, 3] as const,
  Agility: [6, 5, 4, 3] as const,
  Mind: [6, 5, 4, 2] as const,
  Presence: [6, 5, 4, 1] as const
}

describe('onboardingService navigation', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearOnboardingStore()
  })

  it('walks mechanical setup through companions while retaining selections on back', () => {
    const service = createTestService()
    walkThroughCompanionStep(service)
    assertBackNavigationPreservesSelections(service)
  })

  it('blocks play until opening scene is confirmed', () => {
    const service = createTestService()
    beginOnboarding(service, beginRequest())
    advanceToGuidedIdentity(service)
    expect(service.getState({ campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID }).phase).toBe(
      'guided_identity'
    )
  })
})

describe('onboardingService ability and companion paths', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearOnboardingStore()
  })

  it('supports point-buy and roll ability methods plus companion create', () => {
    const service = createTestService()
    beginOnboarding(service, beginRequest())
    saveMechanicalSetupStep(service, {
      ...mechanicalSetupRequest(),
      method: 'point_buy',
      scores: STANDARD_SCORES
    })
    expect(service.getState(ctx()).phase).toBe('race')
    beginOnboarding(service, beginRequest())
    const rolled = service.rollAbilityScores()
    saveMechanicalSetupStep(service, {
      ...mechanicalSetupRequest(),
      method: 'roll',
      scores: rolled.scores,
      rolledDraft: rolled
    })
    saveRaceStep(service, { ...ctx(), raceId: 'elf' })
    saveBackgroundStep(service, { ...ctx(), backgroundId: 'outlander' })
    saveEquipmentStep(service, ctx())
    const withCompanion = saveCompanionsStep(service, {
      ...ctx(),
      action: 'create',
      name: 'Briar',
      archetype: 'Ranger'
    })
    expect(withCompanion.selections.companionName).toBe('Briar')
    expect(withCompanion.phase).toBe('guided_identity')
  })
})

describe('onboardingService completion', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    clearOnboardingStore()
  })

  it('completes guided identity and opening scene into play', async () => {
    const service = createTestService()
    beginOnboarding(service, beginRequest())
    advanceToGuidedIdentity(service)
    await service.startGuidedIdentity(ctx())
    await service.submitGuidedIdentity({ ...ctx(), message: 'I am a tracker.' })
    const scene = await service.generateOpeningScene(ctx())
    expect(scene.prose).toBe('scene')
    const complete = await service.confirmOpeningScene(ctx())
    expect(complete.phase).toBe('complete')
  })

  it('rejects out-of-order steps', () => {
    const service = createTestService()
    beginOnboarding(service, beginRequest())
    expect(() => saveRaceStep(service, { ...ctx(), raceId: 'elf' })).toThrow(/required/)
  })
})

function ctx() {
  return { campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID }
}

function createTestService() {
  return createOnboardingService({
    character: fakeCharacterPorts(),
    dm: fakeDmPorts(),
    narration: fakeNarrationPorts()
  })
}

function walkThroughCompanionStep(service: ReturnType<typeof createOnboardingService>): void {
  beginOnboarding(service, beginRequest())
  saveMechanicalSetupStep(service, mechanicalSetupRequest())
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
    action: 'skip'
  })
}

function assertBackNavigationPreservesSelections(
  service: ReturnType<typeof createOnboardingService>
): void {
  const beforeBack = service.getState({ campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID })
  expect(beforeBack.phase).toBe('guided_identity')
  const afterBack = goBackOnboarding(service, { campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID })
  expect(afterBack.phase).toBe('companions')
  expect(afterBack.selections).toEqual(beforeBack.selections)
  expect(afterBack.selections.archetype).toBe('Ranger')
  expect(afterBack.selections.raceId).toBe('elf')
  expect(afterBack.selections.backgroundId).toBe('outlander')
  expect(afterBack.selections.companionSkipped).toBe(true)
}

function advanceToGuidedIdentity(service: ReturnType<typeof createOnboardingService>): void {
  saveMechanicalSetupStep(service, mechanicalSetupRequest())
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
    action: 'skip'
  })
}

function beginRequest() {
  return { campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID, characterName: 'Ilyra' }
}

function mechanicalSetupRequest() {
  return {
    campaignId: CAMPAIGN_ID,
    characterId: CHARACTER_ID,
    archetype: 'Ranger' as const,
    method: 'standard_array' as const,
    scores: STANDARD_SCORES
  }
}

function fakeCharacterPorts(): OnboardingCharacterPorts {
  return { ...fakeAbilityPorts(), ...fakeSelectionPorts() }
}

function fakeAbilityPorts(): Pick<
  OnboardingCharacterPorts,
  | 'pointBuyAbilityScores'
  | 'assignStandardArrayAbilityScores'
  | 'rollAbilityScoreDraft'
  | 'confirmRolledAbilityScores'
  | 'listArchetypes'
  | 'listCampaignRaces'
  | 'listCampaignBackgrounds'
> {
  return {
    pointBuyAbilityScores: (scores) => scores,
    assignStandardArrayAbilityScores: (scores) => scores,
    rollAbilityScoreDraft: () => ({
      scores: STANDARD_SCORES,
      rolls: ROLL_DETAILS,
      confirmed: false
    }),
    confirmRolledAbilityScores: (draft) => draft.scores,
    listArchetypes: () => [{ id: 'Ranger', name: 'Ranger', minLevel: 1, maxLevel: 20, hitDie: 10 }],
    listCampaignRaces: () => [{ raceId: 'elf', name: 'Elf', lore: 'forest kin' }],
    listCampaignBackgrounds: () => [
      { backgroundId: 'outlander', name: 'Outlander', description: 'wilderness survivor' }
    ]
  }
}

function fakeSelectionPorts(): Pick<
  OnboardingCharacterPorts,
  'selectRace' | 'selectBackground' | 'selectStartingLoadout' | 'createCompanion' | 'skipCompanionCreation'
> {
  return {
    selectRace: (input) => ({
      campaignId: input.campaignId,
      characterId: input.characterId,
      raceId: input.raceId,
      name: 'Elf',
      lore: input.lore ?? 'forest kin'
    }),
    selectBackground: (input) => ({
      campaignId: input.campaignId,
      characterId: input.characterId,
      backgroundId: input.backgroundId,
      name: 'Outlander',
      description: 'wilderness survivor'
    }),
    selectStartingLoadout: (characterId, archetype) => ({
      characterId,
      archetype,
      level: 1,
      catalogVersion: 'test',
      items: [],
      actionIds: []
    }),
    createCompanion: (input) => ({
      characterId: 'companion-1',
      ownerCharacterId: input.ownerCharacterId,
      campaignId: input.campaignId,
      name: input.name,
      isCompanion: true as const,
      archetype: input.archetype
    }),
    skipCompanionCreation: () => 'skipped' as const
  }
}

function fakeDmPorts(): OnboardingDmPorts {
  return {
    startGuidedIdentity: (input) => ({
      campaignId: input.campaignId,
      characterId: input.characterId,
      guidedCreationPhase: 'who',
      transcript: [],
      characterFacts: {},
      enterWorldUnlocked: false
    }),
    submitGuidedIdentityMessage: async () => ({
      ok: true as const,
      phase: 'opening_scene' as const,
      prose: 'dm reply',
      state: {
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        guidedCreationPhase: 'opening_scene',
        transcript: [],
        characterFacts: {},
        enterWorldUnlocked: false
      },
      errors: [] as []
    }),
    generateOpeningScene: async () => ({ ok: true as const, prose: 'scene', errors: [] as [] }),
    confirmOpeningScene: () => ({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID,
      guidedCreationPhase: 'complete' as const,
      transcript: [],
      characterFacts: {},
      enterWorldUnlocked: true
    }),
    getGuidedCreationState: () => undefined
  }
}

function fakeNarrationPorts(): OnboardingNarrationPorts {
  return {
    narration: {
      generateGuidedIdentityReply: async () => ({ ok: true, prose: 'reply', errors: [] }),
      fillAndValidate: async () => ({ ok: true, filled: { OPENING_SCENE: 'scene' }, errors: [] })
    },
    completer: { completeText: async () => ({ text: 'text', backend: 'test' }) },
    characterGrounding: {
      getCharacterIdentity: () => undefined,
      getCharacterArchetype: () => 'Ranger',
      getCharacterStartingLoadout: () => undefined,
      getCompanionOnboardingStatus: () => 'skipped',
      listCompanions: () => []
    }
  }
}
