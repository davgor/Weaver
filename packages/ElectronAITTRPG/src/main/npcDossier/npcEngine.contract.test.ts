import { beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import {
  appendWorldFact,
  clearDmOpinionStore,
  clearNpcStore,
  clearOpinionStore,
  constructNpc,
  getNpcDossier,
  listNpcOpinionsHeldBy,
  setNpcDefeatDisposition,
  upsertDmNpcOpinion,
  upsertNpcOpinion
} from '@weaver/npc-engine'
import { createEnginePorts, loadNpcDossierSnapshot, loadNpcRelationshipSnapshot } from './loadDossier.js'

const CAMPAIGN_ID = 'contract.npc-dossier.campaign'
const WORLD_ID = 'contract.npc-dossier.world'

describe('NPC dossier NPCEngine contract (041/042)', () => {
  beforeEach(resetContractStores)

  it('loads dossier traits, facts, DM opinion, disposition, and held opinions', () => {
    seedContractNpc({
      npcId: 'npc-contract-mira',
      displayName: 'Captain Mira',
      temperament: 'patient'
    })
    seedContractNpc({
      npcId: 'npc-contract-orren',
      displayName: 'Orren Vale',
      temperament: 'guarded'
    })
    seedDossierFactsAndOpinions()

    const ports = createEnginePorts({ getNpcDossier, listNpcOpinionsHeldBy })
    const dossier = loadNpcDossierSnapshot(ports, {
      campaignId: CAMPAIGN_ID,
      npcId: 'npc-contract-mira'
    })
    const relationships = loadNpcRelationshipSnapshot(ports, { npcId: 'npc-contract-mira' })

    expect(dossier.displayName).toBe('Captain Mira')
    expect(dossier.traits).toMatchObject({ temperament: 'patient', speciesKind: 'person' })
    expect(dossier.facts.map((fact) => fact.factId)).toEqual(['contract.fact.mira'])
    expect(dossier.dmOpinion).toBe('Mira will trade favors for safe roads.')
    expect(dossier.disposition?.disposition).toBe('yielded')
    expect(relationships.opinions.map((opinion) => opinion.subjectId)).toEqual([
      'npc-contract-orren',
      'pc-contract-ash'
    ])
  })
})

function resetContractStores(): void {
  clearNpcStore()
  clearDmOpinionStore()
  clearOpinionStore()
  clearNpcPlaceholderStore()
  setCampaignRaceRoster(CAMPAIGN_ID, [{ raceId: 'human', name: 'Human' }])
}

function seedContractNpc(input: {
  npcId: string
  displayName: string
  temperament: string
}): void {
  const [slot] = ensureNpcPlaceholders({
    worldId: WORLD_ID,
    civilizationId: `contract.civ.${input.npcId}`,
    regionId: 'contract.region.north-road',
    roleHints: ['guard']
  })
  if (slot === undefined) throw new Error('Expected contract NPC placeholder')
  constructNpc({
    campaignId: CAMPAIGN_ID,
    worldId: WORLD_ID,
    npcId: input.npcId,
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'lawful',
    temperament: input.temperament,
    abilityScores: { Body: 12, Agility: 12, Mind: 10, Presence: 14 },
    background: { backgroundId: 'warden', name: 'Road Warden' },
    displayName: input.displayName
  })
}

function seedDossierFactsAndOpinions(): void {
  appendWorldFact({
    factId: 'contract.fact.mira',
    text: 'Mira knows which bridge the smugglers avoid.',
    npcIds: ['npc-contract-mira'],
    provenance: { eventId: 'contract.scene.1' }
  })
  upsertDmNpcOpinion({
    campaignId: CAMPAIGN_ID,
    npcId: 'npc-contract-mira',
    text: 'Mira will trade favors for safe roads.'
  })
  setNpcDefeatDisposition({
    npcId: 'npc-contract-mira',
    disposition: 'yielded',
    source: { encounterId: 'contract.encounter.1', actorId: 'pc-contract-ash' }
  })
  seedHeldOpinions()
}

function seedHeldOpinions(): void {
  upsertNpcOpinion({
    holderNpcId: 'npc-contract-mira',
    subjectId: 'npc-contract-orren',
    subjectKind: 'npc',
    trust: -2,
    fear: 1,
    affection: 0,
    stance: 'wary'
  })
  upsertNpcOpinion({
    holderNpcId: 'npc-contract-mira',
    subjectId: 'pc-contract-ash',
    subjectKind: 'pc',
    trust: 4,
    fear: 0,
    affection: 2,
    stance: 'friendly'
  })
}
