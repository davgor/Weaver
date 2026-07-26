import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcPlaceholderStore } from '@weaver/civilization-engine'
import {
  clearDmOpinionStore,
  clearNpcStore,
  clearOpinionStore,
  getNpc,
  getNpcDossier,
  listNpcOpinionsHeldBy
} from '@weaver/npc-engine'
import { ensureDemoNpcDossierData } from './demoSeed.js'

const CAMPAIGN_ID = 'demo.campaign.npc-dossier'
const MIRA_ID = 'demo.npc.mira'
const ORREN_ID = 'demo.npc.orren'

describe('ensureDemoNpcDossierData', () => {
  beforeEach(() => {
    clearNpcStore()
    clearDmOpinionStore()
    clearOpinionStore()
    clearNpcPlaceholderStore()
  })

  it('does not seed the NPCEngine stores for non-demo NPC ids', () => {
    ensureDemoNpcDossierData('npc.real-campaign')

    expect(getNpc(MIRA_ID)).toBeUndefined()
    expect(getNpc(ORREN_ID)).toBeUndefined()
  })

  it('seeds demo NPC dossiers, world facts, dispositions, and relationship opinions', () => {
    ensureDemoNpcDossierData(MIRA_ID)
    ensureDemoNpcDossierData(ORREN_ID)

    const dossier = getNpcDossier({ campaignId: CAMPAIGN_ID, npcId: MIRA_ID })
    const opinions = listNpcOpinionsHeldBy(MIRA_ID)

    expect(dossier.displayName).toBe('Captain Mira')
    expect(dossier.facts.map((fact) => fact.factId)).toEqual(['demo.fact.mira.warden'])
    expect(dossier.dmOpinion).toContain('expects the party to honor bargains')
    expect(dossier.disposition?.disposition).toBe('yielded')
    expect(opinions.map((opinion) => opinion.subjectId)).toEqual([
      ORREN_ID,
      'demo.character.sheet'
    ])
  })

  it('keeps demo NPCs stable when the seeder runs more than once', () => {
    ensureDemoNpcDossierData(MIRA_ID)
    const firstSlot = getNpc(MIRA_ID)?.placeholder.slotId

    ensureDemoNpcDossierData(MIRA_ID)

    expect(getNpc(MIRA_ID)?.placeholder.slotId).toBe(firstSlot)
    expect(listNpcOpinionsHeldBy(MIRA_ID)).toHaveLength(2)
  })
})
