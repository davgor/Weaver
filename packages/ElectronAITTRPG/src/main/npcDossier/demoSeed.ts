import { setCampaignRaceRoster } from '@weaver/character-engine'
import { ensureNpcPlaceholders } from '@weaver/civilization-engine'
import {
  appendWorldFact,
  constructNpc,
  getNpc,
  setNpcDefeatDisposition,
  upsertDmNpcOpinion,
  upsertNpcOpinion
} from '@weaver/npc-engine'

const DEMO_NPC_CAMPAIGN_ID = 'demo.campaign.npc-dossier'
const DEMO_NPC_ID = 'demo.npc.mira'
const DEMO_NPC_DISPLAY_NAME = 'Captain Mira'
const DEMO_RIVAL_NPC_ID = 'demo.npc.orren'
const DEMO_RIVAL_NPC_DISPLAY_NAME = 'Orren Vale'
const DEMO_WORLD_ID = 'demo.world.npc-dossier'
const DEMO_REGION_ID = 'demo.region.ashen-road'

export function ensureDemoNpcDossierData(npcId: string): void {
  if (!isDemoNpc(npcId)) return
  setCampaignRaceRoster(DEMO_NPC_CAMPAIGN_ID, [{ raceId: 'human', name: 'Human' }])
  ensureDemoNpc(DEMO_NPC_ID, DEMO_NPC_DISPLAY_NAME, 'patient')
  ensureDemoNpc(DEMO_RIVAL_NPC_ID, DEMO_RIVAL_NPC_DISPLAY_NAME, 'guarded')
  seedDemoDossierDetails()
}

function isDemoNpc(npcId: string): boolean {
  return npcId === DEMO_NPC_ID || npcId === DEMO_RIVAL_NPC_ID
}

function ensureDemoNpc(npcId: string, displayName: string, temperament: string): void {
  if (getNpc(npcId) !== undefined) return
  const [slot] = ensureNpcPlaceholders({
    worldId: DEMO_WORLD_ID,
    civilizationId: `demo.civ.${npcId}`,
    regionId: DEMO_REGION_ID,
    roleHints: ['guard']
  })
  if (slot === undefined) throw new Error('Unable to create demo NPC placeholder')
  constructNpc({
    campaignId: DEMO_NPC_CAMPAIGN_ID,
    worldId: DEMO_WORLD_ID,
    npcId,
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'lawful neutral',
    temperament,
    abilityScores: { Body: 12, Agility: 12, Mind: 11, Presence: 14 },
    background: { backgroundId: 'road-warden', name: 'Road Warden' },
    displayName
  })
}

function seedDemoDossierDetails(): void {
  appendWorldFact({
    factId: 'demo.fact.mira.warden',
    text: 'Captain Mira knows which bridge the smugglers avoid after sundown.',
    npcIds: [DEMO_NPC_ID],
    provenance: { eventId: 'demo.scene.warden' }
  })
  upsertDmNpcOpinion({
    campaignId: DEMO_NPC_CAMPAIGN_ID,
    npcId: DEMO_NPC_ID,
    text: 'Mira is reliable, but she expects the party to honor bargains publicly.'
  })
  setNpcDefeatDisposition({
    npcId: DEMO_NPC_ID,
    disposition: 'yielded',
    source: { encounterId: 'demo.encounter.bridge', actorId: 'demo.character.sheet' }
  })
  seedDemoOpinions()
}

function seedDemoOpinions(): void {
  upsertNpcOpinion({
    holderNpcId: DEMO_NPC_ID,
    subjectId: DEMO_RIVAL_NPC_ID,
    subjectKind: 'npc',
    trust: -2,
    fear: 1,
    affection: 0,
    stance: 'wary',
    provenance: { eventId: 'demo.scene.warden' }
  })
  upsertNpcOpinion({
    holderNpcId: DEMO_NPC_ID,
    subjectId: 'demo.character.sheet',
    subjectKind: 'pc',
    trust: 3,
    fear: 0,
    affection: 2,
    stance: 'friendly'
  })
}
