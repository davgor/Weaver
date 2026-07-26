import { appendNpcMemory, appendWorldFact, queryNpcGroundingContext } from './memory.js'
import { constructNpc } from './construction.js'
import { getNpc } from './store.js'
import { hydrateNpcCombatTier, setNpcDefeatDisposition } from './combatDisposition.js'
import {
  addNpcToFaction,
  createFaction,
  getFactionRelation,
  listCharacterReputationStandings,
  setFactionRelation,
  updateReputation
} from './factions.js'
import {
  listNpcOpinionsAbout,
  listNpcOpinionsHeldBy,
  upsertNpcOpinion
} from './opinions.js'
import { requestCompanionPortrait, requestNpcPortrait } from './portraitHook.js'
import { selectSocialResponders, updateNpcSpeakingStyle } from './speakingStyle.js'
import type { EngineEndpoint } from './typesApi.js'
import type {
  AddNpcToFactionInput,
  CompanionPortraitHookRequest,
  ConstructNpcInput,
  CreateFactionInput,
  HydrateNpcCombatTierInput,
  ListNpcOpinionsAboutInput,
  ListNpcOpinionsHeldByInput,
  NpcMemory,
  PortraitHookRequest,
  QueryNpcGroundingContextInput,
  SelectSocialRespondersInput,
  SetFactionRelationInput,
  SetNpcDefeatDispositionInput,
  UpdateNpcSpeakingStyleInput,
  UpdateReputationInput,
  UpsertNpcOpinionInput,
  WorldFact
} from './types.js'

const PACKAGE_NAME = '@weaver/npc-engine'
const VERSION = '0.1.0'

export function health() {
  return { ok: true as const, package: PACKAGE_NAME, version: VERSION }
}

export function buildEndpoints(): EngineEndpoint[] {
  return [
    endpoint('health', 'Return package health metadata', () => health()),
    endpoint('constructNpc', 'Claim a placeholder and construct an NPC', constructEndpoint),
    endpoint('getNpc', 'Read one constructed NPC', getNpcEndpoint),
    endpoint('appendNpcMemory', 'Append a private NPC memory', memoryEndpoint),
    endpoint('appendWorldFact', 'Append a tagged world fact', worldFactEndpoint),
    endpoint('queryNpcGroundingContext', 'Query NPC-visible grounding facts', contextEndpoint),
    endpoint('hydrateNpcCombatTier', 'Promote an NPC to combat-tier stats', combatTierEndpoint),
    endpoint('setNpcDefeatDisposition', 'Set defeat disposition from combat', dispositionEndpoint),
    endpoint('createFaction', 'Create a campaign faction', factionEndpoint),
    endpoint('addNpcToFaction', 'Add an NPC membership link to a faction', membershipEndpoint),
    endpoint('setFactionRelation', 'Set a faction-to-faction relation', relationEndpoint),
    endpoint('getFactionRelation', 'Read a faction-to-faction relation', getRelationEndpoint),
    endpoint('updateReputation', 'Mutate character reputation with a faction', reputationEndpoint),
    endpoint('listCharacterReputationStandings', 'List character reputation standings', standingsEndpoint),
    endpoint('upsertNpcOpinion', 'Upsert an NPC opinion of a subject', opinionUpsertEndpoint),
    endpoint('listNpcOpinionsHeldBy', 'List subjects an NPC holds opinions of', opinionsHeldByEndpoint),
    endpoint('listNpcOpinionsAbout', 'List holders with opinions of a subject', opinionsAboutEndpoint),
    endpoint('updateNpcSpeakingStyle', 'Update an NPC speaking style sample', speakingStyleEndpoint),
    endpoint('selectSocialResponders', 'Select deterministic Social turn responders', respondersEndpoint),
    endpoint('requestNpcPortrait', 'Queue an NPC portrait generation request', npcPortraitEndpoint),
    endpoint('requestCompanionPortrait', 'Queue a companion portrait generation request', companionPortraitEndpoint)
  ]
}

function endpoint(name: string, description: string, invoke: EngineEndpoint['invoke']): EngineEndpoint {
  return { name, description, invoke }
}

function constructEndpoint(payload: unknown) {
  return constructNpc(asPayload<ConstructNpcInput>(payload, 'constructNpc'))
}

function getNpcEndpoint(payload: unknown) {
  return getNpc(readString(asRecord(payload, 'getNpc'), 'npcId'))
}

function memoryEndpoint(payload: unknown) {
  return appendNpcMemory(asPayload<NpcMemory>(payload, 'appendNpcMemory'))
}

function worldFactEndpoint(payload: unknown) {
  return appendWorldFact(asPayload<WorldFact>(payload, 'appendWorldFact'))
}

function contextEndpoint(payload: unknown) {
  return queryNpcGroundingContext(asPayload<QueryNpcGroundingContextInput>(payload, 'queryNpcGroundingContext'))
}

function combatTierEndpoint(payload: unknown) {
  return hydrateNpcCombatTier(asPayload<HydrateNpcCombatTierInput>(payload, 'hydrateNpcCombatTier'))
}

function dispositionEndpoint(payload: unknown) {
  return setNpcDefeatDisposition(asPayload<SetNpcDefeatDispositionInput>(payload, 'setNpcDefeatDisposition'))
}

function factionEndpoint(payload: unknown) {
  return createFaction(asPayload<CreateFactionInput>(payload, 'createFaction'))
}

function membershipEndpoint(payload: unknown) {
  return addNpcToFaction(asPayload<AddNpcToFactionInput>(payload, 'addNpcToFaction'))
}

function relationEndpoint(payload: unknown) {
  return setFactionRelation(asPayload<SetFactionRelationInput>(payload, 'setFactionRelation'))
}

function getRelationEndpoint(payload: unknown) {
  const record = asRecord(payload, 'getFactionRelation')
  return getFactionRelation(readString(record, 'sourceFactionId'), readString(record, 'targetFactionId'))
}

function reputationEndpoint(payload: unknown) {
  return updateReputation(asPayload<UpdateReputationInput>(payload, 'updateReputation'))
}

function standingsEndpoint(payload: unknown) {
  return listCharacterReputationStandings(readString(asRecord(payload, 'standings'), 'characterId'))
}

function opinionUpsertEndpoint(payload: unknown) {
  return upsertNpcOpinion(asPayload<UpsertNpcOpinionInput>(payload, 'upsertNpcOpinion'))
}

function opinionsHeldByEndpoint(payload: unknown) {
  const input = asPayload<ListNpcOpinionsHeldByInput>(payload, 'listNpcOpinionsHeldBy')
  return listNpcOpinionsHeldBy(input.holderNpcId)
}

function opinionsAboutEndpoint(payload: unknown) {
  const input = asPayload<ListNpcOpinionsAboutInput>(payload, 'listNpcOpinionsAbout')
  return listNpcOpinionsAbout(input.subjectId)
}

function speakingStyleEndpoint(payload: unknown) {
  return updateNpcSpeakingStyle(asPayload<UpdateNpcSpeakingStyleInput>(payload, 'updateNpcSpeakingStyle'))
}

function respondersEndpoint(payload: unknown) {
  return selectSocialResponders(asPayload<SelectSocialRespondersInput>(payload, 'selectSocialResponders'))
}

function npcPortraitEndpoint(payload: unknown) {
  return requestNpcPortrait(asPayload<PortraitHookRequest>(payload, 'requestNpcPortrait'))
}

function companionPortraitEndpoint(payload: unknown) {
  return requestCompanionPortrait(asPayload<CompanionPortraitHookRequest>(payload, 'requestCompanionPortrait'))
}

function asPayload<T>(payload: unknown, label: string): T {
  asRecord(payload, label)
  return payload as T
}

function asRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`${label} requires an object payload`)
  }
  return payload as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Expected ${key} to be a non-empty string`)
  }
  return value
}
