import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcPlaceholderStore } from '@weaver/civilization-engine'
import {
  clearDmOpinionStore,
  clearNpcStore,
  clearOpinionStore,
  getNpc,
  type NpcDossier,
  type NpcOpinion
} from '@weaver/npc-engine'
import { loadNpcDossier, loadNpcOpinions, type NpcDossierPorts } from './dossierService.js'

describe('NPC dossier service', () => {
  beforeEach(() => {
    clearNpcStore()
    clearDmOpinionStore()
    clearOpinionStore()
    clearNpcPlaceholderStore()
  })

  it('loads non-demo dossiers from injected ports without seeding demo data', () => {
    const snapshot = loadNpcDossier(makePorts(), {
      campaignId: 'campaign-1',
      npcId: 'npc-live'
    })

    expect(snapshot.npcId).toBe('npc-live')
    expect(snapshot.displayName).toBe('Live NPC')
    expect(getNpc('demo.npc.mira')).toBeUndefined()
  })

  it('loads relationships from injected ports after ensuring demo data when requested', () => {
    const snapshot = loadNpcOpinions(makePorts(), { npcId: 'demo.npc.mira' })

    expect(snapshot.holderNpcId).toBe('demo.npc.mira')
    expect(snapshot.opinions).toEqual([
      {
        holderNpcId: 'demo.npc.mira',
        subjectId: 'npc-live',
        subjectKind: 'npc',
        trust: 1,
        fear: 0,
        affection: 0
      }
    ])
    expect(getNpc('demo.npc.mira')).toBeDefined()
  })
})

function makePorts(): NpcDossierPorts {
  return {
    getNpcDossier: (request) => makeDossier(request.npcId),
    listNpcOpinionsHeldBy: (npcId) => [makeOpinion(npcId)]
  }
}

function makeDossier(npcId: string): NpcDossier {
  return {
    npcId,
    campaignId: 'campaign-1',
    displayName: 'Live NPC',
    regionId: 'region-1',
    civilizationId: 'civ-1',
    traits: {
      race: {
        campaignId: 'campaign-1',
        characterId: npcId,
        raceId: 'human',
        name: 'Human',
        lore: 'Adaptable road folk.'
      },
      alignment: 'neutral',
      temperament: 'steady',
      nonSpeaking: false,
      speciesKind: 'person'
    },
    facts: [],
    dmOpinion: null,
    disposition: null
  }
}

function makeOpinion(holderNpcId: string): NpcOpinion {
  return {
    holderNpcId,
    subjectId: 'npc-live',
    subjectKind: 'npc',
    trust: 1,
    fear: 0,
    affection: 0
  }
}
