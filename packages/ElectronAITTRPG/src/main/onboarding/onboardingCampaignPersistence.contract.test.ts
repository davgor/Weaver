import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { AbilityScores } from '@weaver/character-engine'
import {
  createCampaignSession,
  getActiveCampaignSession,
  openCampaignSession,
  type CampaignSession
} from '@weaver/dm-engine'
import { createCampaignHubService, type CampaignHubDeps } from '../campaignHub/campaignHubService.js'
import {
  beginOnboarding,
  createOnboardingService,
  saveBackgroundStep,
  saveCompanionsStep,
  saveEquipmentStep,
  saveMechanicalSetupStep,
  saveRaceStep,
  type OnboardingCharacterPorts,
  type OnboardingDmPorts,
  type OnboardingNarrationPorts,
  type OnboardingService
} from './onboardingService.js'

const CAMPAIGN_ID = 'persisted-onboarding-campaign'
const CHARACTER_ID = 'persisted-onboarding-pc'
const SCORES: AbilityScores = { Body: 14, Agility: 12, Mind: 10, Presence: 8 }

describe('Electron onboarding to hub persistence contract', () => {
  afterEach(() => {
    getActiveCampaignSession()?.close()
  })

  it('lists a completed onboarded character after service restart and session reopen', async () => {
    withCampaignPath(async (filePath) => {
      const firstSession = createCampaignSession({ campaignId: CAMPAIGN_ID, filePath })
      const firstService = createPersistentService(firstSession)
      await completeOnboarding(firstService)
      firstSession.onboardingStore.setActiveCharacterId(CHARACTER_ID)
      firstSession.close()

      const secondSession = openCampaignSession({ campaignId: CAMPAIGN_ID, filePath })
      const secondService = createPersistentService(secondSession)
      const hub = await createHub(secondService, secondSession).loadHub(CAMPAIGN_ID)

      expect(secondService.getState(ctx()).phase).toBe('complete')
      expect(hub.activeCharacterId).toBe(CHARACTER_ID)
      expect(hub.characters).toEqual([
        expect.objectContaining({ characterId: CHARACTER_ID, characterName: 'Ilyra' })
      ])
    })
  })
})

function createPersistentService(session: CampaignSession): OnboardingService {
  return createOnboardingService(testPorts(), { store: session.onboardingStore })
}

async function completeOnboarding(service: OnboardingService): Promise<void> {
  beginOnboarding(service, { ...ctx(), characterName: 'Ilyra' })
  saveMechanicalSetupStep(service, {
    ...ctx(),
    archetype: 'Ranger',
    method: 'standard_array',
    scores: SCORES
  })
  saveRaceStep(service, { ...ctx(), raceId: 'elf' })
  saveBackgroundStep(service, { ...ctx(), backgroundId: 'outlander' })
  saveEquipmentStep(service, ctx())
  saveCompanionsStep(service, { ...ctx(), action: 'skip' })
  service.startGuidedIdentity(ctx())
  await service.submitGuidedIdentity({ ...ctx(), message: 'I keep the road.' })
  await service.generateOpeningScene(ctx())
  service.confirmOpeningScene(ctx())
}

function createHub(service: OnboardingService, session: CampaignSession) {
  return createCampaignHubService(hubDeps(service, session))
}

function hubDeps(service: OnboardingService, session: CampaignSession): CampaignHubDeps {
  return {
    getReview: async () => null,
    listCompletedCharacters: service.listCompletedCharacters,
    listCharacters: service.listCharacters,
    listCompanions: () => [],
    listCausalEvents: () => [],
    getCharacterSessionCursor: () => undefined,
    recordCharacterSessionCursor: (cursor) => cursor,
    buildSessionRecap: () => ({ paragraphs: [], eventIds: [] }),
    getActiveCharacterId: () => session.onboardingStore.getActiveCharacterId(),
    setActiveCharacterId: (_campaignId, characterId) =>
      session.onboardingStore.setActiveCharacterId(characterId)
  }
}

function testPorts() {
  return {
    character: characterPorts(),
    dm: dmPorts(),
    narration: narrationPorts()
  }
}

function characterPorts(): OnboardingCharacterPorts {
  return {
    pointBuyAbilityScores: (scores) => scores,
    assignStandardArrayAbilityScores: (scores) => scores,
    rollAbilityScoreDraft: () => ({ scores: SCORES, rolls: rolls(), confirmed: false }),
    confirmRolledAbilityScores: (draft) => draft.scores,
    listArchetypes: () => [{ id: 'Ranger', name: 'Ranger', minLevel: 1, maxLevel: 20, hitDie: 10 }],
    listCampaignRaces: () => [{ raceId: 'elf', name: 'Elf' }],
    listCampaignBackgrounds: () => [{ backgroundId: 'outlander', name: 'Outlander' }],
    selectRace: (input) => ({ ...input, name: 'Elf' }),
    selectBackground: (input) => ({ ...input, name: 'Outlander' }),
    selectStartingLoadout: (characterId, archetype) => ({
      characterId,
      archetype,
      level: 1,
      catalogVersion: 'test',
      items: [],
      actionIds: []
    }),
    createCompanion: (input) => ({
      characterId: 'companion',
      ownerCharacterId: input.ownerCharacterId,
      campaignId: input.campaignId,
      name: input.name,
      isCompanion: true,
      archetype: input.archetype
    }),
    skipCompanionCreation: () => 'skipped'
  }
}

function dmPorts(): OnboardingDmPorts {
  return {
    startGuidedIdentity: (input) => ({
      ...input,
      guidedCreationPhase: 'who',
      transcript: [],
      characterFacts: {},
      enterWorldUnlocked: false
    }),
    submitGuidedIdentityMessage: async () => ({
      ok: true,
      phase: 'opening_scene',
      prose: 'The road answers.',
      state: {
        campaignId: CAMPAIGN_ID,
        characterId: CHARACTER_ID,
        guidedCreationPhase: 'opening_scene',
        transcript: [],
        characterFacts: {},
        enterWorldUnlocked: false
      },
      errors: []
    }),
    generateOpeningScene: async () => ({ ok: true, prose: 'A bell rings.', errors: [] }),
    confirmOpeningScene: () => ({
      campaignId: CAMPAIGN_ID,
      characterId: CHARACTER_ID,
      guidedCreationPhase: 'complete',
      transcript: [],
      characterFacts: {},
      enterWorldUnlocked: true,
      openingScene: 'A bell rings.'
    }),
    getGuidedCreationState: () => undefined
  }
}

function narrationPorts(): OnboardingNarrationPorts {
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

function rolls() {
  return {
    Body: [6, 5, 4, 3] as const,
    Agility: [6, 5, 4, 3] as const,
    Mind: [6, 5, 4, 2] as const,
    Presence: [6, 5, 4, 1] as const
  }
}

function ctx() {
  return { campaignId: CAMPAIGN_ID, characterId: CHARACTER_ID }
}

function withCampaignPath(run: (filePath: string) => Promise<void>): Promise<void> {
  const root = mkdtempSync(join(tmpdir(), 'aittrpg-onboarding-restart-'))
  return run(join(root, 'campaign.sqlite')).finally(() => {
    rmSync(root, { force: true, recursive: true })
  })
}
