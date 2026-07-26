import { NpcEngineError } from './errors.js'
import { addNpcFaction, requireNpc } from './store.js'
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

const factions = new Map<string, FactionRecord>()
const relations = new Map<string, FactionRelation>()
const reputations = new Map<string, ReputationStanding>()

export function clearFactionStore(): void {
  factions.clear()
  relations.clear()
  reputations.clear()
}

export function createFaction(input: CreateFactionInput): FactionRecord {
  const faction = { factionId: input.factionId, name: input.name, memberships: [] }
  factions.set(input.factionId, faction)
  return copyFaction(faction)
}

export function addNpcToFaction(input: AddNpcToFactionInput): FactionRecord {
  const faction = requireFaction(input.factionId)
  requireNpc(input.npcId)
  const memberships = mergeMembership(faction.memberships, input)
  const updated = { ...faction, memberships }
  factions.set(input.factionId, updated)
  addNpcFaction(input.npcId, input.factionId)
  return copyFaction(updated)
}

export function setFactionRelation(input: SetFactionRelationInput): FactionRelation {
  requireFaction(input.sourceFactionId)
  requireFaction(input.targetFactionId)
  const relation = { ...input }
  relations.set(relationKey(input.sourceFactionId, input.targetFactionId), relation)
  relations.set(relationKey(input.targetFactionId, input.sourceFactionId), reverseRelation(relation))
  return { ...relation }
}

export function getFactionRelation(
  sourceFactionId: string,
  targetFactionId: string
): FactionRelation | undefined {
  const relation = relations.get(relationKey(sourceFactionId, targetFactionId))
  return relation === undefined ? undefined : { ...relation }
}

export function updateReputation(input: UpdateReputationInput): ReputationStanding {
  requireFaction(input.factionId)
  const current = reputations.get(reputationKey(input.characterId, input.factionId))
  const standing = buildStanding(input, current)
  reputations.set(reputationKey(input.characterId, input.factionId), standing)
  return copyStanding(standing)
}

export function getReputationStanding(
  characterId: string,
  factionId: string
): ReputationStanding | undefined {
  const standing = reputations.get(reputationKey(characterId, factionId))
  return standing === undefined ? undefined : copyStanding(standing)
}

export function listCharacterReputationStandings(characterId: string): ReputationStanding[] {
  return [...reputations.values()]
    .filter((standing) => standing.characterId === characterId)
    .map(copyStanding)
}

function requireFaction(factionId: string): FactionRecord {
  const faction = factions.get(factionId)
  if (faction === undefined) {
    throw new NpcEngineError('FACTION_NOT_FOUND', `Faction not found: ${factionId}`)
  }
  return copyFaction(faction)
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

function relationKey(sourceFactionId: string, targetFactionId: string): string {
  return `${sourceFactionId}->${targetFactionId}`
}

function reputationKey(characterId: string, factionId: string): string {
  return `${characterId}->${factionId}`
}

function copyFaction(faction: FactionRecord): FactionRecord {
  return {
    ...faction,
    memberships: faction.memberships.map((membership) => ({ ...membership }))
  }
}

function copyStanding(standing: ReputationStanding): ReputationStanding {
  return {
    ...standing,
    ...(standing.lastProvenance === undefined
      ? {}
      : { lastProvenance: { ...standing.lastProvenance } })
  }
}
