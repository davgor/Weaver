import { describe, expect, it } from 'vitest'
import type { NpcDossier, NpcOpinion } from '@weaver/npc-engine'
import {
  loadNpcDossierSnapshot,
  loadNpcRelationshipSnapshot,
  type NpcDossierPorts
} from './loadDossier.js'

describe('NPC dossier snapshot service', () => {
  it('loads the dossier from injected NPCEngine ports', () => {
    const snapshot = loadNpcDossierSnapshot(makePorts(), {
      campaignId: 'campaign-1',
      npcId: 'npc-mira'
    })

    expect(snapshot.displayName).toBe('Captain Mira')
    expect(snapshot.traits.temperament).toBe('patient')
    expect(snapshot.facts[0]?.text).toContain('hidden pass')
    expect(snapshot.dmOpinion).toBe('Trustworthy when the road is at stake.')
    expect(snapshot.disposition?.disposition).toBe('yielded')
  })

  it('loads opinions held by the requested NPC for relationship web rendering', () => {
    const snapshot = loadNpcRelationshipSnapshot(makePorts(), { npcId: 'npc-mira' })

    expect(snapshot.holderNpcId).toBe('npc-mira')
    expect(snapshot.opinions).toHaveLength(2)
    expect(snapshot.opinions.map((opinion) => opinion.subjectId)).toEqual(['npc-orren', 'pc-ash'])
  })
})

function makePorts(): NpcDossierPorts {
  const dossier = makeDossier()
  const opinions = makeOpinions()
  return {
    getNpcDossier: () => dossier,
    listNpcOpinionsHeldBy: () => opinions
  }
}

function makeDossier(): NpcDossier {
  return {
    npcId: 'npc-mira',
    campaignId: 'campaign-1',
    displayName: 'Captain Mira',
    regionId: 'north-road',
    civilizationId: 'ash-gate',
    traits: {
      race: {
        campaignId: 'campaign-1',
        characterId: 'npc-mira',
        raceId: 'human',
        name: 'Human',
        lore: 'Adaptable road folk.'
      },
      background: { backgroundId: 'warden', name: 'Road Warden' },
      alignment: 'lawful',
      temperament: 'patient',
      nonSpeaking: false,
      speciesKind: 'person'
    },
    facts: [
      {
        factId: 'fact-pass',
        text: 'Mira knows the hidden pass.',
        npcIds: ['npc-mira'],
        provenance: { eventId: 'scene-1' }
      }
    ],
    dmOpinion: 'Trustworthy when the road is at stake.',
    disposition: {
      disposition: 'yielded',
      dead: false,
      source: { encounterId: 'enc-1', actorId: 'pc-ash' }
    }
  }
}

function makeOpinions(): NpcOpinion[] {
  return [
    {
      holderNpcId: 'npc-mira',
      subjectId: 'npc-orren',
      subjectKind: 'npc',
      trust: -2,
      fear: 1,
      affection: 0,
      stance: 'wary'
    },
    {
      holderNpcId: 'npc-mira',
      subjectId: 'pc-ash',
      subjectKind: 'pc',
      trust: 4,
      fear: 0,
      affection: 3,
      stance: 'friendly'
    }
  ]
}
