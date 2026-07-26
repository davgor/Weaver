import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AutoUpdateState,
  ManualUpdateCheckResult
} from '../shared/autoUpdate/types.js'
import { AUTO_UPDATE_EVENT_CHANNEL } from '../shared/autoUpdate/types.js'
import type {
  BeginOnboardingRequest,
  BackgroundStepRequest,
  CampaignCreateDraft,
  CampaignSummary,
  CampaignHubSnapshot,
  CharacterSheetSnapshot,
  CompanionsStepRequest,
  EquipItemRequest,
  EquipmentStepRequest,
  GameApi,
  GenerateRegionNpcRequest,
  GuidedIdentityRequest,
  OpenCampaignRequest,
  LoadCharacterSheetRequest,
  MechanicalSetupRequest,
  OnboardingContextRequest,
  RaceStepRequest,
  RegenerateSectionRequest,
  AskDmRequest,
  AskDmResult,
  SubmitPlayActionRequest,
  SubmitPlayActionResult,
  StartupBootSnapshot,
  UnequipItemRequest,
  UpdateReviewFieldRequest
} from '../shared/gameApi.js'
import type {
  DeleteCampaignRequest,
  ExportCampaignRequest,
  ImportCampaignRequest
} from '../shared/campaigns/types.js'
import type {
  LoadNpcDossierRequest,
  NpcDossierSnapshot,
  NpcRelationshipSnapshot
} from '../shared/npcDossier/types.js'
import type { SettingsApi } from '../shared/settings/types.js'
import type { SettingsIntroApi } from '../shared/settings/settingsIntroTypes.js'
import { LOCAL_MODEL_INSTALL_EVENT_CHANNEL } from '../shared/settings/localModelTypes.js'
import type { LocalModelInstallProgress } from '../shared/settings/localModelTypes.js'

const api: GameApi = {
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },
  startup: {
    getBoot: (): Promise<StartupBootSnapshot> => ipcRenderer.invoke('startup:getBoot')
  },
  campaigns: {
    list: (): Promise<CampaignSummary[]> => ipcRenderer.invoke('campaigns:list'),
    open: (request: OpenCampaignRequest) => ipcRenderer.invoke('campaigns:open', request),
    export: (request: ExportCampaignRequest) => ipcRenderer.invoke('campaigns:export', request),
    import: (request: ImportCampaignRequest) => ipcRenderer.invoke('campaigns:import', request),
    delete: (request: DeleteCampaignRequest) => ipcRenderer.invoke('campaigns:delete', request)
  },
  campaignCreate: {
    startGeneration: (draft: CampaignCreateDraft) =>
      ipcRenderer.invoke('campaignCreate:startGeneration', draft),
    getReview: () => ipcRenderer.invoke('campaignCreate:getReview'),
    updateReviewField: (request: UpdateReviewFieldRequest) =>
      ipcRenderer.invoke('campaignCreate:updateReviewField', request),
    regenerateSection: (request: RegenerateSectionRequest) =>
      ipcRenderer.invoke('campaignCreate:regenerateSection', request),
    generateRegionNpc: (request: GenerateRegionNpcRequest) =>
      ipcRenderer.invoke('campaignCreate:generateRegionNpc', request),
    confirmReview: () => ipcRenderer.invoke('campaignCreate:confirmReview'),
    assertCanContinue: () => ipcRenderer.invoke('campaignCreate:assertCanContinue')
  },
  campaignHub: {
    load: (campaignId: string): Promise<CampaignHubSnapshot> =>
      ipcRenderer.invoke('campaignHub:load', campaignId),
    addCharacter: (campaignId: string) => ipcRenderer.invoke('campaignHub:addCharacter', campaignId)
  },
  play: {
    submitAction: (request: SubmitPlayActionRequest): Promise<SubmitPlayActionResult> =>
      ipcRenderer.invoke('play:submitAction', request),
    askDm: (request: AskDmRequest): Promise<AskDmResult> => ipcRenderer.invoke('play:askDm', request)
  },
  onboarding: {
    begin: (request: BeginOnboardingRequest) => ipcRenderer.invoke('onboarding:begin', request),
    getState: (request: OnboardingContextRequest) =>
      ipcRenderer.invoke('onboarding:getState', request),
    saveMechanicalSetup: (request: MechanicalSetupRequest) =>
      ipcRenderer.invoke('onboarding:saveMechanicalSetup', request),
    saveRace: (request: RaceStepRequest) => ipcRenderer.invoke('onboarding:saveRace', request),
    saveBackground: (request: BackgroundStepRequest) =>
      ipcRenderer.invoke('onboarding:saveBackground', request),
    saveEquipment: (request: EquipmentStepRequest) =>
      ipcRenderer.invoke('onboarding:saveEquipment', request),
    saveCompanions: (request: CompanionsStepRequest) =>
      ipcRenderer.invoke('onboarding:saveCompanions', request),
    startGuidedIdentity: (request: OnboardingContextRequest) =>
      ipcRenderer.invoke('onboarding:startGuidedIdentity', request),
    submitGuidedIdentity: (request: GuidedIdentityRequest) =>
      ipcRenderer.invoke('onboarding:submitGuidedIdentity', request),
    generateOpeningScene: (request: OnboardingContextRequest) =>
      ipcRenderer.invoke('onboarding:generateOpeningScene', request),
    confirmOpeningScene: (request: OnboardingContextRequest) =>
      ipcRenderer.invoke('onboarding:confirmOpeningScene', request),
    goBack: (request: OnboardingContextRequest) => ipcRenderer.invoke('onboarding:goBack', request),
    listArchetypes: () => ipcRenderer.invoke('onboarding:listArchetypes'),
    listRaces: (campaignId: string) => ipcRenderer.invoke('onboarding:listRaces', campaignId),
    listBackgrounds: (campaignId: string) =>
      ipcRenderer.invoke('onboarding:listBackgrounds', campaignId),
    rollAbilityScores: () => ipcRenderer.invoke('onboarding:rollAbilityScores')
  },
  characterSheet: {
    load: (request: LoadCharacterSheetRequest): Promise<CharacterSheetSnapshot> =>
      ipcRenderer.invoke('characterSheet:load', request),
    equip: (request: EquipItemRequest): Promise<CharacterSheetSnapshot> =>
      ipcRenderer.invoke('characterSheet:equip', request),
    unequip: (request: UnequipItemRequest): Promise<CharacterSheetSnapshot> =>
      ipcRenderer.invoke('characterSheet:unequip', request)
  },
  npcDossier: {
    load: (request: LoadNpcDossierRequest): Promise<NpcDossierSnapshot> =>
      ipcRenderer.invoke('npcDossier:load', request),
    opinions: (request: { npcId: string }): Promise<NpcRelationshipSnapshot> =>
      ipcRenderer.invoke('npcDossier:opinions', request)
  },
  settings: {
    get: (): ReturnType<SettingsApi['get']> => ipcRenderer.invoke('settings:get'),
    update: (request: Parameters<SettingsApi['update']>[0]): ReturnType<SettingsApi['update']> =>
      ipcRenderer.invoke('settings:update', request),
    checkConnection: (
      request?: Parameters<SettingsApi['checkConnection']>[0]
    ): ReturnType<SettingsApi['checkConnection']> =>
      ipcRenderer.invoke('settings:checkConnection', request),
    getLocalModelStatus: (): ReturnType<SettingsApi['getLocalModelStatus']> =>
      ipcRenderer.invoke('settings:getLocalModelStatus'),
    installLocalModel: (): ReturnType<SettingsApi['installLocalModel']> =>
      ipcRenderer.invoke('settings:installLocalModel'),
    onLocalModelInstallProgress: (
      listener: (progress: LocalModelInstallProgress) => void
    ): (() => void) => {
      const handler = (_event: IpcRendererEvent, payload: LocalModelInstallProgress): void => {
        listener(payload)
      }
      ipcRenderer.on(LOCAL_MODEL_INSTALL_EVENT_CHANNEL, handler)
      return () => ipcRenderer.removeListener(LOCAL_MODEL_INSTALL_EVENT_CHANNEL, handler)
    }
  },
  settingsIntro: {
    get: (): ReturnType<SettingsIntroApi['get']> => ipcRenderer.invoke('settingsIntro:get'),
    dismiss: (): ReturnType<SettingsIntroApi['dismiss']> => ipcRenderer.invoke('settingsIntro:dismiss')
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
  }
}

const autoUpdate = {
  getState: (): Promise<AutoUpdateState> => ipcRenderer.invoke('autoUpdate:getState'),
  checkForUpdates: (): Promise<ManualUpdateCheckResult> =>
    ipcRenderer.invoke('autoUpdate:checkForUpdates'),
  quitAndInstall: (): Promise<void> => ipcRenderer.invoke('autoUpdate:quitAndInstall'),
  onEvent: (listener: (payload: AutoUpdateState) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, payload: AutoUpdateState): void => {
      listener(payload)
    }
    ipcRenderer.on(AUTO_UPDATE_EVENT_CHANNEL, handler)
    return () => ipcRenderer.removeListener(AUTO_UPDATE_EVENT_CHANNEL, handler)
  }
}

contextBridge.exposeInMainWorld('aiTtrpg', api)
contextBridge.exposeInMainWorld('autoUpdate', autoUpdate)
