import type {
  CausalEvent,
  CharacterSessionCursor,
  SessionRecap,
  SessionRecapInput
} from '@weaver/dm-engine'
import type { ArchetypeId } from '@weaver/character-engine'
import type { CampaignReviewSnapshot } from '../../shared/campaignCreate/types.js'
import type {
  CampaignHubApi,
  CampaignHubCharacter,
  CampaignHubSnapshot,
  CampaignWorldPreview
} from '../../shared/campaignHub/types.js'
import type { BeginOnboardingRequest, WizardPhase } from '../../shared/onboarding/types.js'

type CharacterRecord = {
  campaignId: string
  characterId: string
  characterName: string
  phase: WizardPhase
}

type CompanionRecord = {
  characterId: string
  name: string
  archetype: ArchetypeId
}

export type CampaignHubDeps = {
  getReview: () => Promise<CampaignReviewSnapshot | null>
  listCompletedCharacters: (campaignId: string) => CharacterRecord[]
  listCharacters: (campaignId: string) => CharacterRecord[]
  listCompanions: (ownerCharacterId: string) => CompanionRecord[]
  listCausalEvents: (campaignId: string) => CausalEvent[]
  getCharacterSessionCursor: (
    campaignId: string,
    characterId: string
  ) => CharacterSessionCursor | undefined
  recordCharacterSessionCursor: (cursor: CharacterSessionCursor) => CharacterSessionCursor
  buildSessionRecap: (input: SessionRecapInput) => SessionRecap
  getActiveCharacterId: (campaignId: string) => string | null
  setActiveCharacterId: (campaignId: string, characterId: string | null) => void
}

export type CampaignHubService = CampaignHubApi & {
  loadHub: (campaignId: string) => Promise<CampaignHubSnapshot>
}

export function createCampaignHubService(deps: CampaignHubDeps): CampaignHubService {
  return {
    load: (campaignId) => loadHub(deps, campaignId),
    loadHub: (campaignId) => loadHub(deps, campaignId),
    setActiveCharacter: (campaignId, characterId) => setActiveCharacter(deps, campaignId, characterId),
    addCharacter: (campaignId) => addCharacter(deps, campaignId)
  }
}

async function loadHub(deps: CampaignHubDeps, campaignId: string): Promise<CampaignHubSnapshot> {
  const [review, characters] = await Promise.all([
    deps.getReview(),
    Promise.resolve(deps.listCompletedCharacters(campaignId))
  ])
  const events = deps.listCausalEvents(campaignId)
  const activeCharacterId = resolveActiveCharacterId(deps, campaignId, characters)
  return {
    campaignId,
    activeCharacterId,
    worldPreview: worldPreview(campaignId, review),
    characters: characters.map((character) => hubCharacter(deps, events, character))
  }
}

async function setActiveCharacter(
  deps: CampaignHubDeps,
  campaignId: string,
  characterId: string | null
): Promise<CampaignHubSnapshot> {
  deps.setActiveCharacterId(campaignId, characterId)
  return loadHub(deps, campaignId)
}

async function addCharacter(
  deps: CampaignHubDeps,
  campaignId: string
): Promise<BeginOnboardingRequest> {
  const next = deps.listCharacters(campaignId).length + 1
  return {
    campaignId,
    characterId: `${campaignId}.pc${next}`,
    characterName: `Adventurer ${next}`
  }
}

function hubCharacter(
  deps: CampaignHubDeps,
  events: readonly CausalEvent[],
  character: CharacterRecord
): CampaignHubCharacter {
  return {
    characterId: character.characterId,
    characterName: character.characterName,
    companions: deps.listCompanions(character.characterId),
    recap: recapForCharacter(deps, events, character)
  }
}

function recapForCharacter(
  deps: CampaignHubDeps,
  events: readonly CausalEvent[],
  character: CharacterRecord
): SessionRecap {
  const cursor = deps.getCharacterSessionCursor(character.campaignId, character.characterId)
  const recap = deps.buildSessionRecap({
    events,
    lastSessionAt: cursor?.lastSessionAt ?? 0,
    characterId: character.characterId
  })
  recordLatestCursor(deps, character, events)
  return recap
}

function recordLatestCursor(
  deps: CampaignHubDeps,
  character: CharacterRecord,
  events: readonly CausalEvent[]
): void {
  const latest = Math.max(0, ...events.map((event) => event.at))
  deps.recordCharacterSessionCursor({
    campaignId: character.campaignId,
    characterId: character.characterId,
    lastSessionAt: latest
  })
}

function resolveActiveCharacterId(
  deps: CampaignHubDeps,
  campaignId: string,
  characters: readonly CharacterRecord[]
): string | null {
  const stored = deps.getActiveCharacterId(campaignId)
  if (stored !== null && characters.some((character) => character.characterId === stored)) {
    return stored
  }
  const fallback = characters[0]?.characterId ?? null
  deps.setActiveCharacterId(campaignId, fallback)
  return fallback
}

function worldPreview(
  campaignId: string,
  review: CampaignReviewSnapshot | null
): CampaignWorldPreview {
  if (review === null) return emptyWorldPreview(campaignId)
  return {
    campaignId,
    campaignName: review.campaignName,
    premise: review.storyPremise,
    summary: review.worldSummary,
    regions: review.regions,
    npcs: review.npcs
  }
}

function emptyWorldPreview(campaignId: string): CampaignWorldPreview {
  return {
    campaignId,
    campaignName: campaignId,
    premise: '',
    summary: 'No world preview is available yet.',
    regions: [],
    npcs: []
  }
}
