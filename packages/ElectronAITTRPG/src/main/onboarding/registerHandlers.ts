import { ipcMain } from 'electron'
import type { OnboardingApi } from '../../shared/onboarding/types.js'
import { type OnboardingPorts, type OnboardingService } from './onboardingService.js'

type OnboardingHandlerDeps = {
  service: OnboardingService
}

export function registerOnboardingHandlers(deps: OnboardingHandlerDeps): void {
  const api = buildOnboardingApi(deps.service)
  ipcMain.handle('onboarding:begin', (_event, request) => api.begin(request))
  ipcMain.handle('onboarding:getState', (_event, request) => api.getState(request))
  ipcMain.handle('onboarding:saveMechanicalSetup', (_event, request) =>
    api.saveMechanicalSetup(request)
  )
  ipcMain.handle('onboarding:saveRace', (_event, request) => api.saveRace(request))
  ipcMain.handle('onboarding:saveBackground', (_event, request) => api.saveBackground(request))
  ipcMain.handle('onboarding:saveEquipment', (_event, request) => api.saveEquipment(request))
  ipcMain.handle('onboarding:saveCompanions', (_event, request) => api.saveCompanions(request))
  ipcMain.handle('onboarding:startGuidedIdentity', (_event, request) =>
    api.startGuidedIdentity(request)
  )
  ipcMain.handle('onboarding:submitGuidedIdentity', (_event, request) =>
    api.submitGuidedIdentity(request)
  )
  ipcMain.handle('onboarding:generateOpeningScene', (_event, request) =>
    api.generateOpeningScene(request)
  )
  ipcMain.handle('onboarding:confirmOpeningScene', (_event, request) =>
    api.confirmOpeningScene(request)
  )
  ipcMain.handle('onboarding:goBack', (_event, request) => api.goBack(request))
  ipcMain.handle('onboarding:listArchetypes', () => api.listArchetypes())
  ipcMain.handle('onboarding:listRaces', (_event, campaignId: string) => api.listRaces(campaignId))
  ipcMain.handle('onboarding:listBackgrounds', (_event, campaignId: string) =>
    api.listBackgrounds(campaignId)
  )
  ipcMain.handle('onboarding:rollAbilityScores', () => api.rollAbilityScores())
}

export function buildOnboardingApi(service: OnboardingService): OnboardingApi {
  return {
    begin: async (request) => service.begin(request),
    getState: async (request) => service.getState(request),
    saveMechanicalSetup: async (request) => service.saveMechanicalSetup(request),
    saveRace: async (request) => service.saveRace(request),
    saveBackground: async (request) => service.saveBackground(request),
    saveEquipment: async (request) => service.saveEquipment(request),
    saveCompanions: async (request) => service.saveCompanions(request),
    startGuidedIdentity: async (request) => service.startGuidedIdentity(request),
    submitGuidedIdentity: async (request) => service.submitGuidedIdentity(request),
    generateOpeningScene: async (request) => service.generateOpeningScene(request),
    confirmOpeningScene: async (request) => service.confirmOpeningScene(request),
    goBack: async (request) => service.goBack(request),
    listArchetypes: async () => service.listArchetypes(),
    listRaces: async (campaignId) => service.listRaces(campaignId),
    listBackgrounds: async (campaignId) => service.listBackgrounds(campaignId),
    rollAbilityScores: async () => service.rollAbilityScores()
  }
}

export type { OnboardingPorts }
