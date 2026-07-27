import {
  assignStandardArrayAbilityScores,
  confirmRolledAbilityScores,
  createCompanion,
  getCharacterArchetype,
  getCharacterIdentity,
  getCharacterStartingLoadout,
  getCompanionOnboardingStatus,
  listArchetypes,
  listCampaignBackgrounds,
  listCampaignRaces,
  listCompanions,
  pointBuyAbilityScores,
  rollAbilityScoreDraft,
  selectBackground,
  selectRace,
  selectStartingLoadout,
  skipCompanionCreation,
  type AbilityScores,
  type ArchetypeId
} from '@weaver/character-engine'
import {
  confirmOpeningScene,
  createMemoryOnboardingStore as createDmMemoryOnboardingStore,
  generateOpeningScene,
  getGuidedCreationState,
  startGuidedIdentity,
  submitGuidedIdentityMessage,
  type CharacterIdentityGroundingApi,
  type CharacterIdentitySelection,
  type GuidedCreationNarrationApi,
  type GuidedCreationState,
  type OnboardingStore as DurableOnboardingStore,
  type OnboardingStoredRecord
} from '@weaver/dm-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import { fillAndValidate, generateGuidedIdentityReply } from '@weaver/narration-engine'
import type {
  AbilityGenerationMethod,
  BackgroundStepRequest,
  BeginOnboardingRequest,
  CompanionsStepRequest,
  EquipmentStepRequest,
  GuidedIdentityRequest,
  GuidedIdentityStepResult,
  MechanicalSetupRequest,
  OnboardingContextRequest,
  OnboardingSelectionsSnapshot,
  OnboardingSnapshot,
  OpeningSceneStepResult,
  RaceStepRequest,
  WizardPhase
} from '../../shared/onboarding/types.js'
import { WIZARD_PHASES } from '../../shared/onboarding/types.js'

type OnboardingRecord = {
  campaignId: string
  characterId: string
  characterName: string
  phase: WizardPhase
  selections: OnboardingSelectionsSnapshot
}

export type OnboardingStore = DurableOnboardingStore

export type OnboardingServiceOptions = {
  store?: OnboardingStore
  resolveStore?: (campaignId: string) => OnboardingStore
}

export type OnboardingCharacterSummary = {
  campaignId: string
  characterId: string
  characterName: string
  phase: WizardPhase
}

export type OnboardingCharacterPorts = {
  pointBuyAbilityScores: typeof pointBuyAbilityScores
  assignStandardArrayAbilityScores: typeof assignStandardArrayAbilityScores
  rollAbilityScoreDraft: typeof rollAbilityScoreDraft
  confirmRolledAbilityScores: typeof confirmRolledAbilityScores
  listArchetypes: typeof listArchetypes
  listCampaignRaces: typeof listCampaignRaces
  listCampaignBackgrounds: typeof listCampaignBackgrounds
  selectRace: typeof selectRace
  selectBackground: typeof selectBackground
  selectStartingLoadout: typeof selectStartingLoadout
  createCompanion: typeof createCompanion
  skipCompanionCreation: typeof skipCompanionCreation
}

export type OnboardingDmPorts = {
  startGuidedIdentity: typeof startGuidedIdentity
  submitGuidedIdentityMessage: typeof submitGuidedIdentityMessage
  generateOpeningScene: typeof generateOpeningScene
  confirmOpeningScene: typeof confirmOpeningScene
  getGuidedCreationState: typeof getGuidedCreationState
}

export type OnboardingNarrationPorts = {
  narration: GuidedCreationNarrationApi
  completer: TextCompleter
  characterGrounding: CharacterIdentityGroundingApi
}

export type OnboardingPorts = {
  character: OnboardingCharacterPorts
  dm: OnboardingDmPorts
  narration: OnboardingNarrationPorts
}

export type OnboardingService = {
  begin: (request: BeginOnboardingRequest) => OnboardingSnapshot
  getState: (request: OnboardingContextRequest) => OnboardingSnapshot
  saveMechanicalSetup: (request: MechanicalSetupRequest) => OnboardingSnapshot
  saveRace: (request: RaceStepRequest) => OnboardingSnapshot
  saveBackground: (request: BackgroundStepRequest) => OnboardingSnapshot
  saveEquipment: (request: EquipmentStepRequest) => OnboardingSnapshot
  saveCompanions: (request: CompanionsStepRequest) => OnboardingSnapshot
  startGuidedIdentity: (request: OnboardingContextRequest) => OnboardingSnapshot
  submitGuidedIdentity: (request: GuidedIdentityRequest) => Promise<GuidedIdentityStepResult>
  generateOpeningScene: (request: OnboardingContextRequest) => Promise<OpeningSceneStepResult>
  confirmOpeningScene: (request: OnboardingContextRequest) => OnboardingSnapshot
  goBack: (request: OnboardingContextRequest) => OnboardingSnapshot
  listArchetypes: () => ReturnType<typeof listArchetypes>
  listRaces: (campaignId: string) => ReturnType<typeof listCampaignRaces>
  listBackgrounds: (campaignId: string) => ReturnType<typeof listCampaignBackgrounds>
  rollAbilityScores: () => ReturnType<typeof rollAbilityScoreDraft>
  listCharacters: (campaignId: string) => OnboardingCharacterSummary[]
  listCompletedCharacters: (campaignId: string) => OnboardingCharacterSummary[]
}

const defaultOnboardingStore = createDmMemoryOnboardingStore()

export const createMemoryOnboardingStore = createDmMemoryOnboardingStore

export function createLiveOnboardingPorts(
  narrationOverrides: Pick<OnboardingNarrationPorts, 'completer'> &
    Partial<Omit<OnboardingNarrationPorts, 'completer'>>
): OnboardingPorts {
  return {
    character: createLiveCharacterPorts(),
    dm: createLiveDmPorts(),
    narration: createLiveNarrationPorts(narrationOverrides)
  }
}

export function createLiveCharacterPorts(): OnboardingCharacterPorts {
  return {
    pointBuyAbilityScores,
    assignStandardArrayAbilityScores,
    rollAbilityScoreDraft,
    confirmRolledAbilityScores,
    listArchetypes,
    listCampaignRaces,
    listCampaignBackgrounds,
    selectRace,
    selectBackground,
    selectStartingLoadout,
    createCompanion,
    skipCompanionCreation
  }
}

function createLiveDmPorts(): OnboardingDmPorts {
  return {
    startGuidedIdentity,
    submitGuidedIdentityMessage,
    generateOpeningScene,
    confirmOpeningScene,
    getGuidedCreationState
  }
}

function createLiveNarrationPorts(
  overrides: Pick<OnboardingNarrationPorts, 'completer'> &
    Partial<Omit<OnboardingNarrationPorts, 'completer'>>
): OnboardingNarrationPorts {
  return {
    narration: overrides.narration ?? createGuidedNarrationAdapter(),
    completer: overrides.completer,
    characterGrounding: overrides.characterGrounding ?? createCharacterGroundingPorts()
  }
}

export function createOnboardingService(
  ports: OnboardingPorts,
  options: OnboardingServiceOptions = {}
): OnboardingService {
  return {
    begin: (request) => beginOnboardingRecord(storeFor(options, request.campaignId), request),
    getState: (request) =>
      snapshotFor(ports, requireRecord(storeFor(options, request.campaignId), request)),
    saveMechanicalSetup: (request) =>
      applyMechanicalSetup(ports, storeForRequest(options, request), request),
    saveRace: (request) => applyRaceStep(ports, storeForRequest(options, request), request),
    saveBackground: (request) =>
      applyBackgroundStep(ports, storeForRequest(options, request), request),
    saveEquipment: (request) =>
      applyEquipmentStep(ports, storeForRequest(options, request), request),
    saveCompanions: (request) =>
      applyCompanionsStep(ports, storeForRequest(options, request), request),
    startGuidedIdentity: (request) =>
      applyGuidedIdentityStart(ports, storeForRequest(options, request), request),
    submitGuidedIdentity: (request) =>
      submitGuidedIdentityStep(ports, storeForRequest(options, request), request),
    generateOpeningScene: (request) =>
      generateOpeningSceneStep(ports, storeForRequest(options, request), request),
    confirmOpeningScene: (request) =>
      applyOpeningSceneConfirm(ports, storeForRequest(options, request), request),
    goBack: (request) => applyGoBack(ports, storeForRequest(options, request), request),
    listArchetypes: () => ports.character.listArchetypes(),
    listRaces: (campaignId) => ports.character.listCampaignRaces(campaignId),
    listBackgrounds: (campaignId) => ports.character.listCampaignBackgrounds(campaignId),
    rollAbilityScores: () => ports.character.rollAbilityScoreDraft(),
    listCharacters: (campaignId) =>
      listOnboardingCharacters(campaignId, storeFor(options, campaignId)),
    listCompletedCharacters: (campaignId) =>
      listCompletedOnboardingCharacters(campaignId, storeFor(options, campaignId))
  }
}

export function beginOnboarding(
  service: OnboardingService,
  request: BeginOnboardingRequest
): OnboardingSnapshot {
  return service.begin(request)
}

export function saveMechanicalSetupStep(
  service: OnboardingService,
  request: MechanicalSetupRequest
): OnboardingSnapshot {
  return service.saveMechanicalSetup(request)
}

export function saveRaceStep(
  service: OnboardingService,
  request: RaceStepRequest
): OnboardingSnapshot {
  return service.saveRace(request)
}

export function saveBackgroundStep(
  service: OnboardingService,
  request: BackgroundStepRequest
): OnboardingSnapshot {
  return service.saveBackground(request)
}

export function saveEquipmentStep(
  service: OnboardingService,
  request: EquipmentStepRequest
): OnboardingSnapshot {
  return service.saveEquipment(request)
}

export function saveCompanionsStep(
  service: OnboardingService,
  request: CompanionsStepRequest
): OnboardingSnapshot {
  return service.saveCompanions(request)
}

export function goBackOnboarding(
  service: OnboardingService,
  request: OnboardingContextRequest
): OnboardingSnapshot {
  return service.goBack(request)
}

export function clearOnboardingStore(): void {
  defaultOnboardingStore.clearRecords()
  defaultOnboardingStore.clearGuidedStates()
  defaultOnboardingStore.setActiveCharacterId(null)
}

export function listOnboardingCharacters(
  campaignId: string,
  store: OnboardingStore = defaultOnboardingStore
): OnboardingCharacterSummary[] {
  return store
    .listRecords(campaignId)
    .map(toOnboardingRecord)
    .map(toCharacterSummary)
}

export function listCompletedOnboardingCharacters(
  campaignId: string,
  store: OnboardingStore = defaultOnboardingStore
): OnboardingCharacterSummary[] {
  return listOnboardingCharacters(campaignId, store).filter((record) => record.phase === 'complete')
}

function beginOnboardingRecord(
  store: OnboardingStore,
  request: BeginOnboardingRequest
): OnboardingSnapshot {
  const record: OnboardingRecord = {
    campaignId: request.campaignId,
    characterId: request.characterId,
    characterName: request.characterName,
    phase: 'mechanical_setup',
    selections: {}
  }
  return snapshotWithGuidedState(saveRecord(store, record))
}

function applyMechanicalSetup(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: MechanicalSetupRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'mechanical_setup')
  const scores = resolveAbilityScores(ports, request.method, request.scores, request.rolledDraft)
  record.selections = {
    ...record.selections,
    archetype: request.archetype,
    abilityMethod: request.method,
    abilityScores: scores
  }
  record.phase = nextPhase(record.phase)
  return snapshotFor(ports, saveRecord(store, record))
}

function applyRaceStep(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: RaceStepRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'race')
  const selection = ports.character.selectRace(request)
  record.selections = {
    ...record.selections,
    raceId: selection.raceId,
    raceName: selection.name
  }
  record.phase = nextPhase(record.phase)
  return snapshotFor(ports, saveRecord(store, record))
}

function applyBackgroundStep(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: BackgroundStepRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'background')
  const selection = ports.character.selectBackground(request)
  record.selections = {
    ...record.selections,
    backgroundId: selection.backgroundId,
    backgroundName: selection.name,
    ...(request.personalStory === undefined ? {} : { personalStory: request.personalStory })
  }
  record.phase = nextPhase(record.phase)
  return snapshotFor(ports, saveRecord(store, record))
}

function applyEquipmentStep(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: EquipmentStepRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'equipment')
  const archetype = requireArchetype(record)
  ports.character.selectStartingLoadout(request.characterId, archetype)
  record.phase = nextPhase(record.phase)
  return snapshotFor(ports, saveRecord(store, record))
}

function applyCompanionsStep(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: CompanionsStepRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'companions')
  record.selections = applyCompanionChoice(ports, request, record.selections)
  record.phase = nextPhase(record.phase)
  return snapshotFor(ports, saveRecord(store, record))
}

function applyGuidedIdentityStart(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: OnboardingContextRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'guided_identity')
  const guided = ports.dm.startGuidedIdentity(request)
  return snapshotWithGuidedState(record, guided)
}

async function submitGuidedIdentityStep(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: GuidedIdentityRequest
): Promise<GuidedIdentityStepResult> {
  const record = requireRecord(store, request)
  assertPhase(record, 'guided_identity')
  const result = await ports.dm.submitGuidedIdentityMessage(
    { characterId: request.characterId, message: request.message },
    ports.narration.narration,
    ports.narration.completer,
    ports.narration.characterGrounding
  )
  const snapshot = snapshotFor(ports, record)
  if (!result.ok) {
    return { snapshot, errors: [...result.errors] }
  }
  if (result.phase === 'opening_scene') {
    record.phase = 'opening_scene'
  }
  const saved = saveRecord(store, record)
  return {
    snapshot: snapshotWithGuidedState(saved, result.state),
    reply: result.prose,
    errors: []
  }
}

async function generateOpeningSceneStep(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: OnboardingContextRequest
): Promise<OpeningSceneStepResult> {
  const record = requireRecord(store, request)
  assertPhase(record, 'opening_scene')
  const result = await ports.dm.generateOpeningScene(
    { characterId: request.characterId },
    ports.narration.narration,
    ports.narration.completer
  )
  const snapshot = snapshotFor(ports, record)
  if (!result.ok || result.prose === undefined) {
    return { snapshot, errors: [...result.errors] }
  }
  record.selections = { ...record.selections }
  return {
    snapshot: snapshotFor(ports, saveRecord(store, record)),
    prose: result.prose,
    errors: []
  }
}

function applyOpeningSceneConfirm(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: OnboardingContextRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  assertPhase(record, 'opening_scene')
  const state = ports.dm.confirmOpeningScene(request)
  record.phase = 'complete'
  return snapshotWithGuidedState(saveRecord(store, record), state)
}

function applyGoBack(
  ports: OnboardingPorts,
  store: OnboardingStore,
  request: OnboardingContextRequest
): OnboardingSnapshot {
  const record = requireRecord(store, request)
  record.phase = previousPhase(record.phase)
  return snapshotFor(ports, saveRecord(store, record))
}

function applyCompanionChoice(
  ports: OnboardingPorts,
  request: CompanionsStepRequest,
  selections: OnboardingSelectionsSnapshot
): OnboardingSelectionsSnapshot {
  if (request.action === 'skip') {
    ports.character.skipCompanionCreation(request.characterId)
    return { ...selections, companionSkipped: true }
  }
  const companion = ports.character.createCompanion({
    ownerCharacterId: request.characterId,
    campaignId: request.campaignId,
    name: request.name,
    archetype: request.archetype,
    ...(request.bodyMod === undefined ? {} : { bodyMod: request.bodyMod })
  })
  return {
    ...selections,
    companionSkipped: false,
    companionName: companion.name,
    companionArchetype: companion.archetype
  }
}

function resolveAbilityScores(
  ports: OnboardingPorts,
  method: AbilityGenerationMethod,
  scores: AbilityScores,
  rolledDraft?: MechanicalSetupRequest['rolledDraft']
): AbilityScores {
  if (method === 'point_buy') {
    return ports.character.pointBuyAbilityScores(scores)
  }
  if (method === 'standard_array') {
    return ports.character.assignStandardArrayAbilityScores(scores)
  }
  if (rolledDraft === undefined) {
    throw new Error('Rolled ability scores require a draft to confirm.')
  }
  return ports.character.confirmRolledAbilityScores(rolledDraft)
}

function snapshotFor(ports: OnboardingPorts, record: OnboardingRecord): OnboardingSnapshot {
  const guided = ports.dm.getGuidedCreationState(record.characterId)
  return snapshotWithGuidedState(record, guided)
}

function toCharacterSummary(record: OnboardingRecord): OnboardingCharacterSummary {
  return {
    campaignId: record.campaignId,
    characterId: record.characterId,
    characterName: record.characterName,
    phase: record.phase
  }
}

function snapshotWithGuidedState(
  record: OnboardingRecord,
  guided?: GuidedCreationState
): OnboardingSnapshot {
  return {
    campaignId: record.campaignId,
    characterId: record.characterId,
    characterName: record.characterName,
    phase: record.phase,
    selections: { ...record.selections },
    ...(guided === undefined ? {} : { guidedCreation: guided }),
    ...(guided?.openingScene === undefined ? {} : { openingScene: guided.openingScene })
  }
}

function requireRecord(store: OnboardingStore, request: OnboardingContextRequest): OnboardingRecord {
  const record = store.loadRecord(request.characterId)
  if (record === undefined) {
    throw new Error(`Onboarding has not started for character ${request.characterId}.`)
  }
  const restored = toOnboardingRecord(record)
  if (restored.campaignId !== request.campaignId) {
    throw new Error(`Onboarding character ${request.characterId} is not in campaign ${request.campaignId}.`)
  }
  return restored
}

function requireArchetype(record: OnboardingRecord): ArchetypeId {
  const archetype = record.selections.archetype
  if (archetype === undefined) {
    throw new Error('Archetype must be chosen during mechanical setup.')
  }
  return archetype
}

function assertPhase(record: OnboardingRecord, expected: WizardPhase): void {
  if (record.phase !== expected) {
    throw new Error(`Onboarding step ${expected} required; current phase is ${record.phase}.`)
  }
}

function nextPhase(phase: WizardPhase): WizardPhase {
  const index = WIZARD_PHASES.indexOf(phase)
  return WIZARD_PHASES[index + 1] ?? phase
}

function previousPhase(phase: WizardPhase): WizardPhase {
  const index = WIZARD_PHASES.indexOf(phase)
  return WIZARD_PHASES[Math.max(0, index - 1)] ?? phase
}

function storeFor(options: OnboardingServiceOptions, campaignId: string): OnboardingStore {
  return options.resolveStore?.(campaignId) ?? options.store ?? defaultOnboardingStore
}

function storeForRequest(
  options: OnboardingServiceOptions,
  request: OnboardingContextRequest
): OnboardingStore {
  return storeFor(options, request.campaignId)
}

function saveRecord(store: OnboardingStore, record: OnboardingRecord): OnboardingRecord {
  return toOnboardingRecord(store.saveRecord(record))
}

function toOnboardingRecord(stored: OnboardingStoredRecord): OnboardingRecord {
  return {
    campaignId: stored.campaignId,
    characterId: stored.characterId,
    characterName: stored.characterName,
    phase: toWizardPhase(stored.phase),
    selections: toSelections(stored.selections)
  }
}

function toWizardPhase(phase: string): WizardPhase {
  if ((WIZARD_PHASES as readonly string[]).includes(phase)) {
    return phase as WizardPhase
  }
  throw new Error(`Unknown onboarding phase in campaign store: ${phase}`)
}

function toSelections(value: unknown): OnboardingSelectionsSnapshot {
  if (!isRecord(value)) return {}
  return { ...value } as OnboardingSelectionsSnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function createCharacterGroundingPorts(): CharacterIdentityGroundingApi {
  return {
    getCharacterIdentity: (characterId) => {
      const identity = getCharacterIdentity(characterId)
      if (identity === undefined) return undefined
      const result: CharacterIdentitySelection = {}
      if (identity.race !== undefined) {
        result.race = {
          name: identity.race.name,
          ...(identity.race.lore === undefined ? {} : { lore: identity.race.lore })
        }
      }
      if (identity.background !== undefined) {
        result.background = {
          name: identity.background.name,
          description: identity.background.description,
          ...(identity.background.personalStory === undefined
            ? {}
            : { personalStory: identity.background.personalStory })
        }
      }
      return result
    },
    getCharacterArchetype,
    getCharacterStartingLoadout: (characterId) => {
      const loadout = getCharacterStartingLoadout(characterId)
      if (loadout === undefined) return undefined
      return {
        archetype: loadout.archetype,
        items: loadout.items,
        actionIds: loadout.actionIds
      }
    },
    getCompanionOnboardingStatus,
    listCompanions: (ownerCharacterId) =>
      listCompanions(ownerCharacterId).map((companion) => ({
        name: companion.name,
        archetype: companion.archetype
      }))
  }
}

function createGuidedNarrationAdapter(): GuidedCreationNarrationApi {
  return {
    generateGuidedIdentityReply,
    fillAndValidate
  }
}
