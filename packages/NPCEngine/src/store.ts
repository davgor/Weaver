import { NpcEngineError } from './errors.js'
import { clearNpcLocation, clearNpcLocationStore } from './location.js'
import type { NpcMemory, NpcPortrait, NpcRecord, SpeakingStyle, WorldFact } from './types.js'

const npcs = new Map<string, NpcRecord>()
const memories = new Map<string, NpcMemory[]>()
const worldFacts = new Map<string, WorldFact>()

export function clearNpcStore(): void {
  npcs.clear()
  memories.clear()
  worldFacts.clear()
  clearNpcLocationStore()
}

export function saveNpc(npc: NpcRecord): NpcRecord {
  npcs.set(npc.npcId, copyNpc(npc))
  return copyNpc(npc)
}

export function getNpc(npcId: string): NpcRecord | undefined {
  const npc = npcs.get(npcId)
  return npc === undefined ? undefined : copyNpc(npc)
}

export function requireNpc(npcId: string): NpcRecord {
  const npc = npcs.get(npcId)
  if (npc === undefined) {
    throw new NpcEngineError('NPC_NOT_FOUND', `NPC not found: ${npcId}`)
  }
  return copyNpc(npc)
}

export function replaceNpc(npc: NpcRecord): NpcRecord {
  requireNpc(npc.npcId)
  return saveNpc(npc)
}

export function addNpcFaction(npcId: string, factionId: string): NpcRecord {
  const npc = requireNpc(npcId)
  if (!npc.factionIds.includes(factionId)) {
    npc.factionIds = [...npc.factionIds, factionId]
  }
  return replaceNpc(npc)
}

export function updateNpcPortrait(npcId: string, portrait: NpcPortrait): NpcRecord {
  const npc = requireNpc(npcId)
  return replaceNpc({ ...npc, portrait })
}

export function appendMemory(memory: NpcMemory): NpcMemory {
  requireNpc(memory.npcId)
  const entries = memories.get(memory.npcId) ?? []
  const nextMemory = copyMemory(memory)
  memories.set(memory.npcId, [...entries, nextMemory])
  return copyMemory(nextMemory)
}

export function listMemories(npcId: string): NpcMemory[] {
  return (memories.get(npcId) ?? []).map(copyMemory)
}

export function saveWorldFact(fact: WorldFact): WorldFact {
  const nextFact = copyWorldFact(fact)
  worldFacts.set(fact.factId, nextFact)
  return copyWorldFact(nextFact)
}

export function listWorldFacts(): WorldFact[] {
  return [...worldFacts.values()].map(copyWorldFact)
}

export function listNpcsForCampaign(campaignId: string): NpcRecord[] {
  return [...npcs.values()]
    .filter((npc) => npc.campaignId === campaignId)
    .map(copyNpc)
}

export function clearCampaignNpcs(campaignId: string): void {
  for (const npc of listNpcsForCampaign(campaignId)) {
    npcs.delete(npc.npcId)
    memories.delete(npc.npcId)
    clearNpcLocation(npc.npcId)
  }
}

function copyNpc(npc: NpcRecord): NpcRecord {
  return {
    ...npc,
    placeholder: { ...npc.placeholder },
    identity: {
      ...npc.identity,
      race: { ...npc.identity.race },
      ...(npc.identity.background === undefined ? {} : { background: { ...npc.identity.background } })
    },
    abilityScores: { ...npc.abilityScores },
    abilityModifiers: { ...npc.abilityModifiers },
    combatStats: { ...npc.combatStats },
    factionIds: [...npc.factionIds],
    ...(npc.speakingStyle === undefined ? {} : { speakingStyle: copySpeakingStyle(npc.speakingStyle) }),
    ...(npc.portrait === undefined ? {} : { portrait: { ...npc.portrait } }),
    ...(npc.defeatDisposition === undefined
      ? {}
      : { defeatDisposition: { ...npc.defeatDisposition, source: { ...npc.defeatDisposition.source } } })
  }
}

function copySpeakingStyle(style: SpeakingStyle): SpeakingStyle {
  return { tone: style.tone, vocabulary: [...style.vocabulary] }
}

function copyMemory(memory: NpcMemory): NpcMemory {
  return { ...memory, provenance: { ...memory.provenance } }
}

function copyWorldFact(fact: WorldFact): WorldFact {
  return {
    ...fact,
    provenance: { ...fact.provenance },
    ...(fact.regionIds === undefined ? {} : { regionIds: [...fact.regionIds] }),
    ...(fact.factionIds === undefined ? {} : { factionIds: [...fact.factionIds] }),
    ...(fact.npcIds === undefined ? {} : { npcIds: [...fact.npcIds] })
  }
}
