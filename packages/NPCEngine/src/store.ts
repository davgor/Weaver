import { NpcEngineError } from './errors.js'
import type { NpcLocation } from './location.js'
import type {
  DmNpcOpinion,
  FactionRecord,
  FactionRelation,
  NpcMemory,
  NpcOpinion,
  NpcPortrait,
  NpcRecord,
  ReputationStanding,
  SpeakingStyle,
  WorldFact
} from './types.js'

export type NpcCampaignStore = {
  getNpc: (npcId: string) => NpcRecord | undefined
  setNpc: (npc: NpcRecord) => NpcRecord
  deleteNpc: (npcId: string) => boolean
  listNpcsForCampaign: (campaignId: string) => NpcRecord[]
  clearNpcs: () => void
  clearNpcsForCampaign: (campaignId: string) => void

  appendMemory: (memory: NpcMemory) => NpcMemory
  listMemories: (npcId: string) => NpcMemory[]
  clearMemories: () => void
  clearMemoriesForNpc: (npcId: string) => void

  setWorldFact: (fact: WorldFact) => WorldFact
  listWorldFacts: () => WorldFact[]
  clearWorldFacts: () => void

  getFaction: (factionId: string) => FactionRecord | undefined
  setFaction: (faction: FactionRecord) => FactionRecord
  listFactions: () => FactionRecord[]
  clearFactions: () => void

  getFactionRelation: (sourceFactionId: string, targetFactionId: string) => FactionRelation | undefined
  setFactionRelation: (relation: FactionRelation) => FactionRelation
  listFactionRelations: () => FactionRelation[]
  clearFactionRelations: () => void

  getReputation: (characterId: string, factionId: string) => ReputationStanding | undefined
  setReputation: (standing: ReputationStanding) => ReputationStanding
  listReputationsForCharacter: (characterId: string) => ReputationStanding[]
  listReputations: () => ReputationStanding[]
  clearReputations: () => void

  setNpcOpinion: (opinion: NpcOpinion) => NpcOpinion
  listNpcOpinionsHeldBy: (holderNpcId: string) => NpcOpinion[]
  listNpcOpinionsAbout: (subjectId: string) => NpcOpinion[]
  listNpcOpinions: () => NpcOpinion[]
  clearNpcOpinions: () => void

  setDmNpcOpinion: (campaignId: string, npcId: string, text: string) => string
  getDmNpcOpinion: (campaignId: string, npcId: string) => string | undefined
  listDmNpcOpinionsForCampaign: (campaignId: string) => DmNpcOpinion[]
  clearDmNpcOpinions: () => void

  getLocation: (npcId: string) => NpcLocation | undefined
  setLocation: (location: NpcLocation) => NpcLocation
  deleteLocation: (npcId: string) => boolean
  listLocations: (campaignId?: string) => NpcLocation[]
  clearLocations: () => void
  clearLocationsForCampaign: (campaignId: string) => void
}

let activeStore: NpcCampaignStore = createMemoryNpcCampaignStore()
let campaignBound = false

type MemoryNpcCampaignStoreMaps = {
  npcs: Map<string, NpcRecord>
  memories: Map<string, NpcMemory[]>
  worldFacts: Map<string, WorldFact>
  factions: Map<string, FactionRecord>
  relations: Map<string, FactionRelation>
  reputations: Map<string, ReputationStanding>
  opinions: Map<string, NpcOpinion>
  dmOpinions: Map<string, DmNpcOpinion>
  locations: Map<string, NpcLocation>
}

export function createMemoryNpcCampaignStore(): NpcCampaignStore {
  const maps: MemoryNpcCampaignStoreMaps = {
    npcs: new Map<string, NpcRecord>(),
    memories: new Map<string, NpcMemory[]>(),
    worldFacts: new Map<string, WorldFact>(),
    factions: new Map<string, FactionRecord>(),
    relations: new Map<string, FactionRelation>(),
    reputations: new Map<string, ReputationStanding>(),
    opinions: new Map<string, NpcOpinion>(),
    dmOpinions: new Map<string, DmNpcOpinion>(),
    locations: new Map<string, NpcLocation>()
  }
  return {
    ...createNpcRecordMemoryStore(maps),
    ...createWorldFactMemoryStore(maps),
    ...createFactionMemoryStore(maps),
    ...createReputationMemoryStore(maps),
    ...createOpinionMemoryStore(maps),
    ...createLocationMemoryStore(maps)
  }
}

function createNpcRecordMemoryStore(
  maps: MemoryNpcCampaignStoreMaps
): Pick<
  NpcCampaignStore,
  | 'getNpc'
  | 'setNpc'
  | 'deleteNpc'
  | 'listNpcsForCampaign'
  | 'clearNpcs'
  | 'clearNpcsForCampaign'
  | 'appendMemory'
  | 'listMemories'
  | 'clearMemories'
  | 'clearMemoriesForNpc'
> {
  return {
    getNpc: (npcId) => copyOptional(maps.npcs.get(npcId), copyNpc),
    setNpc: (npc) => {
      maps.npcs.set(npc.npcId, copyNpc(npc))
      return copyNpc(npc)
    },
    deleteNpc: (npcId) => maps.npcs.delete(npcId),
    listNpcsForCampaign: (campaignId) =>
      [...maps.npcs.values()].filter((npc) => npc.campaignId === campaignId).map(copyNpc),
    clearNpcs: () => {
      maps.npcs.clear()
    },
    clearNpcsForCampaign: (campaignId) => {
      for (const npc of maps.npcs.values()) {
        if (npc.campaignId === campaignId) {
          maps.npcs.delete(npc.npcId)
        }
      }
    },
    appendMemory: (memory) => {
      const entries = maps.memories.get(memory.npcId) ?? []
      const nextMemory = copyMemory(memory)
      maps.memories.set(memory.npcId, [...entries, nextMemory])
      return copyMemory(nextMemory)
    },
    listMemories: (npcId) => (maps.memories.get(npcId) ?? []).map(copyMemory),
    clearMemories: () => {
      maps.memories.clear()
    },
    clearMemoriesForNpc: (npcId) => {
      maps.memories.delete(npcId)
    }
  }
}

function createWorldFactMemoryStore(
  maps: MemoryNpcCampaignStoreMaps
): Pick<NpcCampaignStore, 'setWorldFact' | 'listWorldFacts' | 'clearWorldFacts'> {
  return {
    setWorldFact: (fact) => {
      maps.worldFacts.set(fact.factId, copyWorldFact(fact))
      return copyWorldFact(fact)
    },
    listWorldFacts: () => [...maps.worldFacts.values()].map(copyWorldFact),
    clearWorldFacts: () => {
      maps.worldFacts.clear()
    }
  }
}

function createFactionMemoryStore(
  maps: MemoryNpcCampaignStoreMaps
): Pick<
  NpcCampaignStore,
  | 'getFaction'
  | 'setFaction'
  | 'listFactions'
  | 'clearFactions'
  | 'getFactionRelation'
  | 'setFactionRelation'
  | 'listFactionRelations'
  | 'clearFactionRelations'
> {
  return {
    getFaction: (factionId) => copyOptional(maps.factions.get(factionId), copyFaction),
    setFaction: (faction) => {
      maps.factions.set(faction.factionId, copyFaction(faction))
      return copyFaction(faction)
    },
    listFactions: () => [...maps.factions.values()].map(copyFaction),
    clearFactions: () => {
      maps.factions.clear()
    },
    getFactionRelation: (sourceFactionId, targetFactionId) =>
      copyOptional(maps.relations.get(relationKey(sourceFactionId, targetFactionId)), copyRelation),
    setFactionRelation: (relation) => {
      const key = relationKey(relation.sourceFactionId, relation.targetFactionId)
      maps.relations.set(key, copyRelation(relation))
      return copyRelation(relation)
    },
    listFactionRelations: () => [...maps.relations.values()].map(copyRelation),
    clearFactionRelations: () => {
      maps.relations.clear()
    }
  }
}

function createReputationMemoryStore(
  maps: MemoryNpcCampaignStoreMaps
): Pick<
  NpcCampaignStore,
  | 'getReputation'
  | 'setReputation'
  | 'listReputationsForCharacter'
  | 'listReputations'
  | 'clearReputations'
> {
  return {
    getReputation: (characterId, factionId) =>
      copyOptional(maps.reputations.get(reputationKey(characterId, factionId)), copyStanding),
    setReputation: (standing) => {
      maps.reputations.set(
        reputationKey(standing.characterId, standing.factionId),
        copyStanding(standing)
      )
      return copyStanding(standing)
    },
    listReputationsForCharacter: (characterId) =>
      [...maps.reputations.values()]
        .filter((standing) => standing.characterId === characterId)
        .map(copyStanding),
    listReputations: () => [...maps.reputations.values()].map(copyStanding),
    clearReputations: () => {
      maps.reputations.clear()
    }
  }
}

function createOpinionMemoryStore(
  maps: MemoryNpcCampaignStoreMaps
): Pick<
  NpcCampaignStore,
  | 'setNpcOpinion'
  | 'listNpcOpinionsHeldBy'
  | 'listNpcOpinionsAbout'
  | 'listNpcOpinions'
  | 'clearNpcOpinions'
  | 'setDmNpcOpinion'
  | 'getDmNpcOpinion'
  | 'listDmNpcOpinionsForCampaign'
  | 'clearDmNpcOpinions'
> {
  return {
    setNpcOpinion: (opinion) => {
      maps.opinions.set(opinionKey(opinion.holderNpcId, opinion.subjectId), copyOpinion(opinion))
      return copyOpinion(opinion)
    },
    listNpcOpinionsHeldBy: (holderNpcId) =>
      [...maps.opinions.values()]
        .filter((opinion) => opinion.holderNpcId === holderNpcId)
        .map(copyOpinion),
    listNpcOpinionsAbout: (subjectId) =>
      [...maps.opinions.values()]
        .filter((opinion) => opinion.subjectId === subjectId)
        .map(copyOpinion),
    listNpcOpinions: () => [...maps.opinions.values()].map(copyOpinion),
    clearNpcOpinions: () => {
      maps.opinions.clear()
    },
    setDmNpcOpinion: (campaignId, npcId, text) => {
      maps.dmOpinions.set(dmOpinionKey(campaignId, npcId), { campaignId, npcId, text })
      return text
    },
    getDmNpcOpinion: (campaignId, npcId) =>
      maps.dmOpinions.get(dmOpinionKey(campaignId, npcId))?.text,
    listDmNpcOpinionsForCampaign: (campaignId) =>
      [...maps.dmOpinions.values()]
        .filter((opinion) => opinion.campaignId === campaignId)
        .map(copyDmOpinion),
    clearDmNpcOpinions: () => {
      maps.dmOpinions.clear()
    }
  }
}

function createLocationMemoryStore(
  maps: MemoryNpcCampaignStoreMaps
): Pick<
  NpcCampaignStore,
  | 'getLocation'
  | 'setLocation'
  | 'deleteLocation'
  | 'listLocations'
  | 'clearLocations'
  | 'clearLocationsForCampaign'
> {
  return {
    getLocation: (npcId) => copyOptional(maps.locations.get(npcId), copyLocation),
    setLocation: (location) => {
      maps.locations.set(location.npcId, copyLocation(location))
      return copyLocation(location)
    },
    deleteLocation: (npcId) => maps.locations.delete(npcId),
    listLocations: (campaignId) => listLocations(maps.locations, campaignId),
    clearLocations: () => {
      maps.locations.clear()
    },
    clearLocationsForCampaign: (campaignId) => {
      for (const record of maps.locations.values()) {
        if (record.campaignId === campaignId) {
          maps.locations.delete(record.npcId)
        }
      }
    }
  }
}

export function clearNpcStore(): void {
  getNpcCampaignStore().clearNpcs()
  getNpcCampaignStore().clearMemories()
  getNpcCampaignStore().clearWorldFacts()
  getNpcCampaignStore().clearLocations()
}

export function saveNpc(npc: NpcRecord): NpcRecord {
  return getNpcCampaignStore().setNpc(npc)
}

export function getNpc(npcId: string): NpcRecord | undefined {
  return getNpcCampaignStore().getNpc(npcId)
}

export function requireNpc(npcId: string): NpcRecord {
  const npc = getNpc(npcId)
  if (npc === undefined) {
    throw new NpcEngineError('NPC_NOT_FOUND', `NPC not found: ${npcId}`)
  }
  return npc
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
  return getNpcCampaignStore().appendMemory(memory)
}

export function listMemories(npcId: string): NpcMemory[] {
  return getNpcCampaignStore().listMemories(npcId)
}

export function saveWorldFact(fact: WorldFact): WorldFact {
  return getNpcCampaignStore().setWorldFact(fact)
}

export function listWorldFacts(): WorldFact[] {
  return getNpcCampaignStore().listWorldFacts()
}

export function listNpcsForCampaign(campaignId: string): NpcRecord[] {
  return getNpcCampaignStore().listNpcsForCampaign(campaignId)
}

export function clearCampaignNpcs(campaignId: string): void {
  for (const npc of listNpcsForCampaign(campaignId)) {
    getNpcCampaignStore().clearMemoriesForNpc(npc.npcId)
    getNpcCampaignStore().deleteLocation(npc.npcId)
    getNpcCampaignStore().deleteNpc(npc.npcId)
  }
}

export function getNpcCampaignStore(): NpcCampaignStore {
  return activeStore
}

export function bindNpcCampaignStore(store: NpcCampaignStore): void {
  activeStore = store
  campaignBound = true
}

export function unbindNpcCampaignStore(): void {
  activeStore = createMemoryNpcCampaignStore()
  campaignBound = false
}

export function isNpcCampaignStoreBound(): boolean {
  return campaignBound
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

function copyFaction(faction: FactionRecord): FactionRecord {
  return {
    ...faction,
    memberships: faction.memberships.map((membership) => ({ ...membership }))
  }
}

function copyRelation(relation: FactionRelation): FactionRelation {
  return { ...relation }
}

function copyStanding(standing: ReputationStanding): ReputationStanding {
  return {
    ...standing,
    ...(standing.lastProvenance === undefined
      ? {}
      : { lastProvenance: { ...standing.lastProvenance } })
  }
}

function copyOpinion(opinion: NpcOpinion): NpcOpinion {
  return {
    ...opinion,
    ...(opinion.provenance === undefined ? {} : { provenance: { ...opinion.provenance } })
  }
}

function copyDmOpinion(opinion: DmNpcOpinion): DmNpcOpinion {
  return { ...opinion }
}

function copyLocation(record: NpcLocation): NpcLocation {
  return {
    npcId: record.npcId,
    campaignId: record.campaignId,
    regionId: record.regionId,
    locationKind: record.locationKind,
    ...(record.placeId === undefined ? {} : { placeId: record.placeId }),
    ...(record.updatedDay === undefined ? {} : { updatedDay: record.updatedDay })
  }
}

function listLocations(
  locations: ReadonlyMap<string, NpcLocation>,
  campaignId: string | undefined
): NpcLocation[] {
  const records = [...locations.values()].map(copyLocation)
  const filtered =
    campaignId === undefined ? records : records.filter((record) => record.campaignId === campaignId)
  return filtered.sort((left, right) => left.npcId.localeCompare(right.npcId))
}

function relationKey(sourceFactionId: string, targetFactionId: string): string {
  return `${sourceFactionId}->${targetFactionId}`
}

function reputationKey(characterId: string, factionId: string): string {
  return `${characterId}->${factionId}`
}

function opinionKey(holderNpcId: string, subjectId: string): string {
  return `${holderNpcId}->${subjectId}`
}

function dmOpinionKey(campaignId: string, npcId: string): string {
  return `${campaignId}:${npcId}`
}

function copyOptional<T>(value: T | undefined, copy: (value: T) => T): T | undefined {
  return value === undefined ? undefined : copy(value)
}
