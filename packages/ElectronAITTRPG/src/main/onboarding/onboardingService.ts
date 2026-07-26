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
  generateOpeningScene,
  getGuidedCreationState,
  startGuidedIdentity,
  submitGuidedIdentityMessage,
  type CharacterIdentityGroundingApi,
  type CharacterIdentitySelection,
  type GuidedCreationNarrationApi,
  type GuidedCreationState
} from '@weaver/dm-engine'
import { createTextCompletionClient, type LlmRuntime } from '@weaver/llm-engine'
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

const records = new Map<string, OnboardingRecord>()

export function createLiveOnboardingPorts(
  narrationOverrides?: Partial<OnboardingNarrationPorts>
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
  overrides?: Partial<OnboardingNarrationPorts>
): OnboardingNarrationPorts {
  return {
    narration: overrides?.narration ?? createGuidedNarrationAdapter(),
    completer: overrides?.completer ?? createConfiguredTextCompleter(),
    characterGrounding: overrides?.characterGrounding ?? createCharacterGroundingPorts()
  }
}

export function createOnboardingService(ports: OnboardingPorts): OnboardingService {
  return {
    begin: (request) => beginOnboardingRecord(request),
    getState: (request) => snapshotFor(requireRecord(request.characterId)),
    saveMechanicalSetup: (request) => applyMechanicalSetup(ports, request),
    saveRace: (request) => applyRaceStep(ports, request),
    saveBackground: (request) => applyBackgroundStep(ports, request),
    saveEquipment: (request) => applyEquipmentStep(ports, request),
    saveCompanions: (request) => applyCompanionsStep(ports, request),
    startGuidedIdentity: (request) => applyGuidedIdentityStart(ports, request),
    submitGuidedIdentity: (request) => submitGuidedIdentityStep(ports, request),
    generateOpeningScene: (request) => generateOpeningSceneStep(ports, request),
    confirmOpeningScene: (request) => applyOpeningSceneConfirm(ports, request),
    goBack: (request) => applyGoBack(request),
    listArchetypes: () => ports.character.listArchetypes(),
    listRaces: (campaignId) => ports.character.listCampaignRaces(campaignId),
    listBackgrounds: (campaignId) => ports.character.listCampaignBackgrounds(campaignId),
    rollAbilityScores: () => ports.character.rollAbilityScoreDraft(),
    listCharacters: (campaignId) => listOnboardingCharacters(campaignId),
    listCompletedCharacters: (campaignId) => listCompletedOnboardingCharacters(campaignId)
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

export function saveRaceStep(service: OnboardingService, request: RaceStepRequest): OnboardingSnapshot {
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
  records.clear()
}

export function listOnboardingCharacters(campaignId: string): OnboardingCharacterSummary[] {
  return [...records.values()]
    .filter((record) => record.campaignId === campaignId)
    .map(toCharacterSummary)
}

export function listCompletedOnboardingCharacters(campaignId: string): OnboardingCharacterSummary[] {
  return listOnboardingCharacters(campaignId).filter((record) => record.phase === 'complete')
}

function beginOnboardingRecord(request: BeginOnboardingRequest): OnboardingSnapshot {
  const record: OnboardingRecord = {
    campaignId: request.campaignId,
    characterId: request.characterId,
    characterName: request.characterName,
    phase: 'mechanical_setup',
    selections: {}
  }
  records.set(request.characterId, record)
  return snapshotFor(record)
}

function applyMechanicalSetup(
  ports: OnboardingPorts,
  request: MechanicalSetupRequest
): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'mechanical_setup')
  const scores = resolveAbilityScores(ports, request.method, request.scores, request.rolledDraft)
  record.selections = {
    ...record.selections,
    archetype: request.archetype,
    abilityMethod: request.method,
    abilityScores: scores
  }
  record.phase = nextPhase(record.phase)
  return snapshotFor(record)
}

function applyRaceStep(ports: OnboardingPorts, request: RaceStepRequest): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'race')
  const selection = ports.character.selectRace(request)
  record.selections = {
    ...record.selections,
    raceId: selection.raceId,
    raceName: selection.name
  }
  record.phase = nextPhase(record.phase)
  return snapshotFor(record)
}

function applyBackgroundStep(
  ports: OnboardingPorts,
  request: BackgroundStepRequest
): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'background')
  const selection = ports.character.selectBackground(request)
  record.selections = {
    ...record.selections,
    backgroundId: selection.backgroundId,
    backgroundName: selection.name,
    ...(request.personalStory === undefined ? {} : { personalStory: request.personalStory })
  }
  record.phase = nextPhase(record.phase)
  return snapshotFor(record)
}

function applyEquipmentStep(
  ports: OnboardingPorts,
  request: EquipmentStepRequest
): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'equipment')
  const archetype = requireArchetype(record)
  ports.character.selectStartingLoadout(request.characterId, archetype)
  record.phase = nextPhase(record.phase)
  return snapshotFor(record)
}

function applyCompanionsStep(
  ports: OnboardingPorts,
  request: CompanionsStepRequest
): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'companions')
  record.selections = applyCompanionChoice(ports, request, record.selections)
  record.phase = nextPhase(record.phase)
  return snapshotFor(record)
}

function applyGuidedIdentityStart(
  ports: OnboardingPorts,
  request: OnboardingContextRequest
): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'guided_identity')
  ports.dm.startGuidedIdentity(request)
  return snapshotFor(record)
}

async function submitGuidedIdentityStep(
  ports: OnboardingPorts,
  request: GuidedIdentityRequest
): Promise<GuidedIdentityStepResult> {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'guided_identity')
  const result = await ports.dm.submitGuidedIdentityMessage(
    { characterId: request.characterId, message: request.message },
    ports.narration.narration,
    ports.narration.completer,
    ports.narration.characterGrounding
  )
  const snapshot = snapshotFor(record)
  if (!result.ok) {
    return { snapshot, errors: [...result.errors] }
  }
  if (result.phase === 'opening_scene') {
    record.phase = 'opening_scene'
  }
  return {
    snapshot: snapshotFor(record),
    reply: result.prose,
    errors: []
  }
}

async function generateOpeningSceneStep(
  ports: OnboardingPorts,
  request: OnboardingContextRequest
): Promise<OpeningSceneStepResult> {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'opening_scene')
  const result = await ports.dm.generateOpeningScene(
    { characterId: request.characterId },
    ports.narration.narration,
    ports.narration.completer
  )
  const snapshot = snapshotFor(record)
  if (!result.ok || result.prose === undefined) {
    return { snapshot, errors: [...result.errors] }
  }
  record.selections = { ...record.selections }
  return { snapshot: snapshotFor(record), prose: result.prose, errors: [] }
}

function applyOpeningSceneConfirm(
  ports: OnboardingPorts,
  request: OnboardingContextRequest
): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  assertPhase(record, 'opening_scene')
  const state = ports.dm.confirmOpeningScene(request)
  record.phase = 'complete'
  return snapshotWithGuidedState(record, state)
}

function applyGoBack(request: OnboardingContextRequest): OnboardingSnapshot {
  const record = requireRecord(request.characterId)
  record.phase = previousPhase(record.phase)
  return snapshotFor(record)
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

function snapshotFor(record: OnboardingRecord): OnboardingSnapshot {
  const guided = getGuidedCreationState(record.characterId)
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

function requireRecord(characterId: string): OnboardingRecord {
  const record = records.get(characterId)
  if (record === undefined) {
    throw new Error(`Onboarding has not started for character ${characterId}.`)
  }
  return record
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

function createConfiguredTextCompleter(): TextCompleter {
  let runtime: LlmRuntime | null = null
  return {
    completeText: async (request) => {
      if (runtime === null) {
        runtime = createTextCompletionClient()
      }
      const response = await runtime.completeText(request)
      return { text: response.text, backend: String(response.backend) }
    }
  }
}

function createGuidedNarrationAdapter(): GuidedCreationNarrationApi {
  return {
    generateGuidedIdentityReply,
    fillAndValidate
  }
}
