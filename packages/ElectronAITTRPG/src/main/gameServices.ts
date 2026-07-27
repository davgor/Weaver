import { join } from 'node:path'
import { listCompanions } from '@weaver/character-engine'
import {
  buildSessionRecap,
  getCharacterSessionCursor,
  listCausalEvents,
  recordCharacterSessionCursor
} from '@weaver/dm-engine'
import { createTextCompletionClient, llmEngine } from '@weaver/llm-engine'
import { narrationEngine } from '@weaver/narration-engine'
import {
  createCampaignCreateService,
  type CampaignCreateService
} from './campaignCreate/campaignCreateService.js'
import {
  createLiveGenerationDeps,
  createLiveGenerationPort
} from './campaignCreate/runGeneration.js'
import { createCampaignHubService, type CampaignHubService } from './campaignHub/campaignHubService.js'
import { createCampaignsService, type CampaignsService } from './campaigns/campaignsService.js'
import {
  createLiveOnboardingPorts,
  createOnboardingService,
  type OnboardingService
} from './onboarding/onboardingService.js'
import { createLivePlayHandlerDeps, type LivePlayDeps } from './play/livePlayDeps.js'
import type { SettingsHandlerDeps } from './settings/registerHandlers.js'
import {
  createSharedSettingsServices,
  type SharedSettingsServices
} from './settings/sharedSettingsServices.js'

type GameServices = {
  settings: SharedSettingsServices
  settingsHandlers: SettingsHandlerDeps
  campaignCreate: CampaignCreateService
  onboarding: OnboardingService
  campaigns: CampaignsService
  campaignHub: CampaignHubService
  play: LivePlayDeps
}

export function createGameServices(campaignsRoot: string): GameServices {
  const settings = createSharedSettingsServices()
  const completer = settings.textCompleter
  const campaignCreate = createCampaignCreateWithCompleter(campaignsRoot, completer)
  const onboarding = createOnboardingService(createLiveOnboardingPorts({ completer }))
  return {
    settings,
    settingsHandlers: buildSettingsHandlerDeps(settings),
    campaignCreate,
    onboarding,
    campaigns: createCampaignsService({
      getReview: campaignCreate.getReview,
      listCharacters: onboarding.listCharacters
    }),
    campaignHub: createHubService(campaignCreate, onboarding),
    play: createLivePlayHandlerDeps({ textCompleter: completer })
  }
}

export function resolveCampaignsRoot(userDataPath: string): string {
  return join(userDataPath, 'campaigns')
}

function createCampaignCreateWithCompleter(
  campaignsRoot: string,
  completer: SharedSettingsServices['textCompleter']
): CampaignCreateService {
  return createCampaignCreateService(
    createLiveGenerationPort(campaignsRoot, createLiveGenerationDeps(completer))
  )
}

function createHubService(
  campaignCreate: CampaignCreateService,
  onboarding: OnboardingService
): CampaignHubService {
  return createCampaignHubService({
    getReview: campaignCreate.getReview,
    listCompletedCharacters: onboarding.listCompletedCharacters,
    listCharacters: onboarding.listCharacters,
    listCompanions,
    listCausalEvents,
    getCharacterSessionCursor,
    recordCharacterSessionCursor,
    buildSessionRecap
  })
}

function buildSettingsHandlerDeps(settings: SharedSettingsServices): SettingsHandlerDeps {
  return {
    store: settings.store,
    runtime: settings.runtime,
    narration: narrationEngine,
    connection: {
      createTextClient: createTextCompletionClient,
      llmEngine
    },
    llmEngine
  }
}
