import { NpcEngineError } from './errors.js'
import { addNpcFaction, getNpcCampaignStore, requireNpc } from './store.js'
import type {
  AddNpcToFactionInput,
  CreateFactionInput,
  FactionRecord,
  FactionMembership,
  FactionRelation,
  ReputationStanding,
  SetFactionRelationInput,
  UpdateReputationInput
} from './types.js'

export function clearFactionStore(): void {
  getNpcCampaignStore().clearFactions()
  getNpcCampaignStore().clearFactionRelations()
  getNpcCampaignStore().clearReputations()
}

export function createFaction(input: CreateFactionInput): FactionRecord {
  const faction = { factionId: input.factionId, name: input.name, memberships: [] }
  return getNpcCampaignStore().setFaction(faction)
}

export function addNpcToFaction(input: AddNpcToFactionInput): FactionRecord {
  const faction = requireFaction(input.factionId)
  requireNpc(input.npcId)
  const memberships = mergeMembership(faction.memberships, input)
  const updated = { ...faction, memberships }
  getNpcCampaignStore().setFaction(updated)
  addNpcFaction(input.npcId, input.factionId)
  return copyFaction(updated)
}

export function setFactionRelation(input: SetFactionRelationInput): FactionRelation {
  requireFaction(input.sourceFactionId)
  requireFaction(input.targetFactionId)
  const relation = { ...input }
  getNpcCampaignStore().setFactionRelation(relation)
  getNpcCampaignStore().setFactionRelation(reverseRelation(relation))
  return { ...relation }
}

export function getFactionRelation(
  sourceFactionId: string,
  targetFactionId: string
): FactionRelation | undefined {
  return getNpcCampaignStore().getFactionRelation(sourceFactionId, targetFactionId)
}

export function updateReputation(input: UpdateReputationInput): ReputationStanding {
  requireFaction(input.factionId)
  const current = getNpcCampaignStore().getReputation(input.characterId, input.factionId)
  const standing = buildStanding(input, current)
  return getNpcCampaignStore().setReputation(standing)
}

export function getReputationStanding(
  characterId: string,
  factionId: string
): ReputationStanding | undefined {
  return getNpcCampaignStore().getReputation(characterId, factionId)
}

export function listCharacterReputationStandings(characterId: string): ReputationStanding[] {
  return getNpcCampaignStore().listReputationsForCharacter(characterId)
}

function requireFaction(factionId: string): FactionRecord {
  const faction = getNpcCampaignStore().getFaction(factionId)
  if (faction === undefined) {
    throw new NpcEngineError('FACTION_NOT_FOUND', `Faction not found: ${factionId}`)
  }
  return faction
}

function mergeMembership(
  memberships: readonly FactionMembership[],
  input: AddNpcToFactionInput
): FactionMembership[] {
  const existing = memberships.filter((membership) => membership.npcId !== input.npcId)
  return [...existing, optionalRole(input)]
}

function optionalRole(input: AddNpcToFactionInput) {
  return input.role === undefined ? { npcId: input.npcId } : { npcId: input.npcId, role: input.role }
}

function buildStanding(
  input: UpdateReputationInput,
  current: ReputationStanding | undefined
): ReputationStanding {
  return {
    characterId: input.characterId,
    factionId: input.factionId,
    score: (current?.score ?? 0) + input.delta,
    ...(input.provenance === undefined ? {} : { lastProvenance: { ...input.provenance } })
  }
}

function reverseRelation(relation: FactionRelation): FactionRelation {
  return {
    sourceFactionId: relation.targetFactionId,
    targetFactionId: relation.sourceFactionId,
    relation: relation.relation
  }
}

function copyFaction(faction: FactionRecord): FactionRecord {
  return {
    ...faction,
    memberships: faction.memberships.map((membership) => ({ ...membership }))
  }
}
