import { listNpcOpinionsHeldBy } from './opinions.js'
import { appendMemory, listMemories, listWorldFacts, requireNpc, saveWorldFact } from './store.js'
import type {
  GroundingContext,
  NpcMemory,
  QueryNpcGroundingContextInput,
  WorldFact
} from './types.js'

export function appendNpcMemory(memory: NpcMemory): NpcMemory {
  return appendMemory(memory)
}

export function appendWorldFact(fact: WorldFact): WorldFact {
  return saveWorldFact(fact)
}

export function listWorldFactsMentioningNpc(npcId: string): WorldFact[] {
  return listWorldFacts().filter((fact) => fact.npcIds?.includes(npcId) ?? false)
}

export function queryNpcGroundingContext(input: QueryNpcGroundingContextInput): GroundingContext {
  const npc = requireNpc(input.npcId)
  return {
    npcId: npc.npcId,
    privateMemories: listMemories(npc.npcId),
    worldFacts: listWorldFacts().filter((fact) => factAppliesToNpc(fact, npc.regionId, npc.factionIds)),
    opinions: listNpcOpinionsHeldBy(npc.npcId)
  }
}

function factAppliesToNpc(fact: WorldFact, regionId: string, factionIds: readonly string[]): boolean {
  return factMatchesRegion(fact, regionId) || factMatchesFaction(fact, factionIds)
}

function factMatchesRegion(fact: WorldFact, regionId: string): boolean {
  return fact.regionIds?.includes(regionId) ?? false
}

function factMatchesFaction(fact: WorldFact, factionIds: readonly string[]): boolean {
  return fact.factionIds?.some((factionId) => factionIds.includes(factionId)) ?? false
}
