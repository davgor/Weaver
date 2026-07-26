import { beforeEach, describe, expect, it } from 'vitest'
import type { FillAndValidateResult, GuidedIdentityResult, TextCompleter } from '@weaver/narration-engine'
import {
  clearCompanionStore,
  clearStartingLoadoutStore,
  setCampaignBackgroundRoster,
  setCampaignRaceRoster
} from '@weaver/character-engine'
import { resetGuidedCreationStateStore } from '@weaver/dm-engine'
import {
  beginOnboarding,
  clearOnboardingStore,
  createLiveOnboardingPorts,
  createOnboardingService,
  saveBackgroundStep,
  saveCompanionsStep,
  saveEquipmentStep,
  saveMechanicalSetupStep,
  saveRaceStep,
  type OnboardingPorts
} from './onboardingService.js'

const CAMPAIGN_ID = `onboarding-dm-${Date.now()}`
const CHARACTER_ID = `onboarding-pc-dm-${Date.now()}`

describe('onboarding DMEngine guided creation contract (061)', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearOnboardingStore()
    resetGuidedCreationStateStore()
    seedCharacterFacts()
  })

  it('starts guided identity through real DMEngine exports after mechanical onboarding', async () => {
    const ports = createContractPorts()
    const service = createOnboardingService(ports)
    advanceToGuidedIdentity(service)

    const snapshot = service.startGuidedIdentity({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID
    })
    expect(snapshot.guidedCreation?.guidedCreationPhase).toBe('who')

    const reply = await service.submitGuidedIdentity({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID,
      message: 'Who am I?'
    })
    expect(reply.errors).toEqual([])
    expect(reply.reply).toContain('Contract PC')
    expect(reply.snapshot.guidedCreation?.guidedCreationPhase).toBe('why')
  })
})

function advanceToGuidedIdentity(service: ReturnType<typeof createOnboardingService>): void {
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
    action: 'skip'
  })
}

function seedCharacterFacts(): void {
  setCampaignRaceRoster(CAMPAIGN_ID, [{ raceId: 'elf', name: 'Elf', lore: 'forest kin' }])
  setCampaignBackgroundRoster(CAMPAIGN_ID, [
    {
      backgroundId: 'outlander',
      name: 'Outlander',
      description: 'wilderness survivor'
    }
  ])
}

function createContractPorts(): OnboardingPorts {
  return createLiveOnboardingPorts({
    completer: scriptedCompleter(),
    narration: scriptedNarration()
  })
}

function scriptedNarration() {
  return {
    generateGuidedIdentityReply: async (): Promise<GuidedIdentityResult> => ({
      ok: true,
      prose: 'Race: elf. Background: outlander. Archetype: ranger. Contract PC remembers the road.',
      errors: []
    }),
    fillAndValidate: async (): Promise<FillAndValidateResult> => ({
      ok: true,
      filled: { OPENING_SCENE: 'Race: elf. Background: outlander. Archetype: ranger. Dawn finds Contract PC.' },
      errors: []
    })
  }
}

function scriptedCompleter(): TextCompleter {
  return { completeText: async () => ({ text: 'guided', backend: 'test' }) }
}
