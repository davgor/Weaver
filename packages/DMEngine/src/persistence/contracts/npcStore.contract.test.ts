import {
  addNpcToFaction,
  appendNpcMemory,
  appendWorldFact,
  clearFactionStore,
  clearNpcLocationStore,
  clearNpcStore,
  clearOpinionStore,
  createFaction,
  getFactionRelation,
  getNpc,
  getNpcDossier,
  getNpcLocation,
  getReputationStanding,
  queryNpcGroundingContext,
  saveNpc,
  setFactionRelation,
  setNpcLocation,
  unbindNpcCampaignStore,
  updateReputation,
  upsertDmNpcOpinion,
  upsertNpcOpinion,
  type NpcRecord
} from '@weaver/npc-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCampaignSession, openCampaignSession } from '../campaignSession.js'

const CAMPAIGN_ID = 'npc-camp'

describe('npc campaign store contract', () => {
  afterEach(() => {
    unbindNpcCampaignStore()
    clearInMemoryNpcStores()
  })

  it('round-trips NPC facts through SQLite reopen without leaking memories', () => {
    withCampaignPath((filePath) => {
      const created = createCampaignSession({ campaignId: CAMPAIGN_ID, filePath })
      seedNpcFacts()
      const before = snapshotNpcFacts()
      created.close()

      unbindNpcCampaignStore()
      clearInMemoryNpcStores()
      expect(getNpc('npc-a')).toBeUndefined()

      const opened = openCampaignSession({ campaignId: CAMPAIGN_ID, filePath })
      expect(snapshotNpcFacts()).toEqual(before)
      expect(queryNpcGroundingContext({ npcId: 'npc-a' }).privateMemories).toHaveLength(1)
      expect(queryNpcGroundingContext({ npcId: 'npc-b' }).privateMemories).toHaveLength(1)
      opened.close()
    })
  })
})

function seedNpcFacts(): void {
  saveNpc(buildNpc('npc-a', 'region-north'))
  saveNpc(buildNpc('npc-b', 'region-south'))
  appendNpcMemory({ npcId: 'npc-a', text: 'Knows the old road.', provenance: { eventId: 'a-1' } })
  appendNpcMemory({ npcId: 'npc-b', text: 'Guards the ferry.', provenance: { eventId: 'b-1' } })
  appendWorldFact({
    factId: 'fact-a',
    text: 'The old road crosses region north.',
    regionIds: ['region-north'],
    npcIds: ['npc-a'],
    provenance: { eventId: 'fact-1' }
  })
  createFaction({ factionId: 'guild', name: 'River Guild' })
  createFaction({ factionId: 'watch', name: 'Town Watch' })
  addNpcToFaction({ factionId: 'guild', npcId: 'npc-a', role: 'factor' })
  setFactionRelation({ sourceFactionId: 'guild', targetFactionId: 'watch', relation: 'allied' })
  updateReputation({
    characterId: 'pc-1',
    factionId: 'guild',
    delta: 4,
    provenance: { eventId: 'rep-1' }
  })
  upsertNpcOpinion({
    holderNpcId: 'npc-a',
    subjectId: 'pc-1',
    subjectKind: 'pc',
    trust: 2,
    fear: 0,
    affection: 1,
    stance: 'friendly',
    provenance: { eventId: 'opinion-1' }
  })
  upsertDmNpcOpinion({ campaignId: CAMPAIGN_ID, npcId: 'npc-a', text: 'Reliable if paid.' })
  setNpcLocation({
    npcId: 'npc-a',
    campaignId: CAMPAIGN_ID,
    regionId: 'region-north',
    placeId: 'settlement-1',
    locationKind: 'settlement',
    updatedDay: 5
  })
}

function snapshotNpcFacts() {
  return {
    npcA: getNpc('npc-a'),
    npcB: getNpc('npc-b'),
    contextA: queryNpcGroundingContext({ npcId: 'npc-a' }),
    contextB: queryNpcGroundingContext({ npcId: 'npc-b' }),
    dossierA: getNpcDossier({ npcId: 'npc-a', campaignId: CAMPAIGN_ID }),
    relation: getFactionRelation('guild', 'watch'),
    reputation: getReputationStanding('pc-1', 'guild'),
    location: getNpcLocation('npc-a')
  }
}

function buildNpc(npcId: string, regionId: string): NpcRecord {
  return {
    npcId,
    campaignId: CAMPAIGN_ID,
    worldId: 'world-1',
    regionId,
    civilizationId: 'civ-1',
    placeholder: {
      slotId: `slot-${npcId}`,
      worldId: 'world-1',
      civilizationId: 'civ-1',
      regionId,
      roleHint: 'resident'
    },
    identity: {
      race: { raceId: 'human', name: 'Human' },
      alignment: 'neutral',
      temperament: 'steady',
      nonSpeaking: false
    },
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    abilityModifiers: { Body: 0, Agility: 0, Mind: 0, Presence: 0 },
    speciesKind: 'person',
    combatStats: { kind: 'civilian', maxHp: 4, currentHp: 4 },
    factionIds: []
  }
}

function clearInMemoryNpcStores(): void {
  clearNpcStore()
  clearFactionStore()
  clearOpinionStore()
  clearNpcLocationStore()
}

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-npc-store-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
