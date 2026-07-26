import { beforeEach, describe, expect, it } from 'vitest'
import {
  appendWorldFact,
  clearDmOpinionStore,
  clearNpcStore,
  getNpcDossier,
  npcEngine,
  NpcEngineError,
  setNpcDefeatDisposition,
  upsertDmNpcOpinion
} from './index.js'
import { seedNpc } from './testHelpers.js'

const CAMPAIGN_A = 'campaign-a'
const CAMPAIGN_B = 'campaign-b'
const DOSSIER_NPC_ID = 'npc-dossier'

function resetDossierState() {
  clearNpcStore()
  clearDmOpinionStore()
}

function seedDossierNpc() {
  seedNpc({
    npcId: DOSSIER_NPC_ID,
    campaignId: CAMPAIGN_A,
    regionId: 'north',
    alignment: 'lawful',
    temperament: 'patient'
  })
}

function seedDossierFacts() {
  appendWorldFact({
    factId: 'fact-about',
    text: 'The warden knows the hidden path.',
    npcIds: [DOSSIER_NPC_ID],
    provenance: { eventId: 'scene-1' }
  })
  appendWorldFact({
    factId: 'fact-other-npc',
    text: 'Another NPC secret.',
    npcIds: ['npc-other'],
    provenance: { eventId: 'scene-2' }
  })
}

function seedDossierOpinionAndDisposition() {
  upsertDmNpcOpinion({
    campaignId: CAMPAIGN_A,
    npcId: DOSSIER_NPC_ID,
    text: 'A reliable informant when paid.'
  })
  setNpcDefeatDisposition({
    npcId: DOSSIER_NPC_ID,
    disposition: 'yielded',
    source: { encounterId: 'enc-1', actorId: 'combat-engine' }
  })
}

describe('getNpcDossier assembly', () => {
  beforeEach(resetDossierState)

  it('assembles traits, npc-tagged facts, dm opinion, and defeat disposition', () => {
    seedDossierNpc()
    seedDossierFacts()
    seedDossierOpinionAndDisposition()

    const dossier = getNpcDossier({ npcId: DOSSIER_NPC_ID, campaignId: CAMPAIGN_A })

    expect(dossier).toMatchObject({
      npcId: DOSSIER_NPC_ID,
      campaignId: CAMPAIGN_A,
      regionId: 'north',
      traits: {
        alignment: 'lawful',
        temperament: 'patient',
        nonSpeaking: false,
        speciesKind: 'person',
        race: { raceId: 'human', name: 'Human' }
      },
      dmOpinion: 'A reliable informant when paid.',
      disposition: {
        disposition: 'yielded',
        dead: false,
        source: { encounterId: 'enc-1', actorId: 'combat-engine' }
      }
    })
    expect(dossier.facts.map((fact) => fact.factId)).toEqual(['fact-about'])
  })
})

describe('getNpcDossier campaign scoping', () => {
  beforeEach(resetDossierState)

  it('rejects dossier reads when campaignId does not match the NPC record', () => {
    seedNpc({ npcId: 'npc-leak', campaignId: CAMPAIGN_A })

    expect(() => getNpcDossier({ npcId: 'npc-leak', campaignId: CAMPAIGN_B })).toThrow(NpcEngineError)
    expect(() => getNpcDossier({ npcId: 'npc-leak', campaignId: CAMPAIGN_B })).toThrow(
      /campaign/i
    )
  })

  it('keeps dm opinions and facts scoped per campaign and npc', () => {
    seedNpc({ npcId: 'npc-a', campaignId: CAMPAIGN_A, regionId: 'north' })
    seedNpc({ npcId: 'npc-b', campaignId: CAMPAIGN_B, regionId: 'north' })
    appendWorldFact({
      factId: 'fact-a',
      text: 'Fact for campaign A NPC.',
      npcIds: ['npc-a'],
      provenance: { eventId: 'a-event' }
    })
    appendWorldFact({
      factId: 'fact-b',
      text: 'Fact for campaign B NPC.',
      npcIds: ['npc-b'],
      provenance: { eventId: 'b-event' }
    })
    upsertDmNpcOpinion({ campaignId: CAMPAIGN_A, npcId: 'npc-a', text: 'Campaign A note' })
    upsertDmNpcOpinion({ campaignId: CAMPAIGN_B, npcId: 'npc-b', text: 'Campaign B note' })

    const dossierA = getNpcDossier({ npcId: 'npc-a', campaignId: CAMPAIGN_A })
    const dossierB = getNpcDossier({ npcId: 'npc-b', campaignId: CAMPAIGN_B })

    expect(dossierA.facts.map((fact) => fact.factId)).toEqual(['fact-a'])
    expect(dossierA.dmOpinion).toBe('Campaign A note')
    expect(dossierB.facts.map((fact) => fact.factId)).toEqual(['fact-b'])
    expect(dossierB.dmOpinion).toBe('Campaign B note')
  })
})

describe('getNpcDossier endpoint', () => {
  beforeEach(resetDossierState)

  it('returns the dossier through the engine call pattern', async () => {
    seedNpc({ npcId: 'npc-endpoint', campaignId: CAMPAIGN_A })
    upsertDmNpcOpinion({
      campaignId: CAMPAIGN_A,
      npcId: 'npc-endpoint',
      text: 'Endpoint note'
    })

    const dossier = (await npcEngine.call('getNpcDossier', {
      npcId: 'npc-endpoint',
      campaignId: CAMPAIGN_A
    })) as Awaited<ReturnType<typeof getNpcDossier>>

    expect(dossier.dmOpinion).toBe('Endpoint note')
    expect(dossier.traits.race.name).toBe('Human')
  })
})
