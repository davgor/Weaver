import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearNpcStore,
  getNpc,
  selectSocialResponders,
  updateNpcSpeakingStyle,
  type NpcRecord
} from '@weaver/npc-engine'
import { saveNpc } from '../../../NPCEngine/dist/store.js'
import { generateScene, validateClaims } from '../index.js'
import type { NarrationPeers } from '../peers.js'

describe('NarrationEngine -> NPCEngine claim validation contract', () => {
  beforeEach(() => {
    clearNpcStore()
  })

  it('validates npcPresent claims through the real getNpc export', async () => {
    seedFixtureNpc('npc-mira')
    expect(getNpc('npc-mira')?.npcId).toBe('npc-mira')

    const peers = peersUsingRealNpcLookup()
    const accepted = validateClaims([{ kind: 'npcPresent', npcId: 'npc-mira' }], peers)
    const rejected = validateClaims([{ kind: 'npcPresent', npcId: 'npc-absent' }], peers)

    expect(accepted.ok).toBe(true)
    expect(rejected.ok).toBe(false)
    expect(rejected.rejected[0]?.reason).toMatch(/npc-absent/)

    const outcome = await generateScene(
      { prompt: 'Narrate Mira at her post.' },
      {
        ...peers,
        llm: {
          completeText: async () => ({
            text: 'Mira nods.\n<<<CLAIMS\nnpcPresent:npc-mira\n>>>',
            backend: 'cpu'
          })
        }
      }
    )

    expect(outcome.status).toBe('persisted')
  })

  it('uses real selectSocialResponders when choosing which NPCs may speak', () => {
    seedFixtureNpc('npc-a')
    seedFixtureNpc('npc-b')
    updateNpcSpeakingStyle({
      npcId: 'npc-a',
      speakingStyle: { tone: 'curt', vocabulary: ['aye'] }
    })
    updateNpcSpeakingStyle({
      npcId: 'npc-b',
      speakingStyle: { tone: 'warm', vocabulary: ['friend'] }
    })

    const responders = selectSocialResponders({
      presentNpcIds: ['npc-a', 'npc-b'],
      addressedTarget: 'npc-b'
    })

    expect(responders).toEqual(['npc-b'])
    expect(getNpc(responders[0] ?? '')?.speakingStyle?.tone).toBe('warm')
  })
})

function peersUsingRealNpcLookup(): NarrationPeers {
  return {
    llm: { completeText: async () => ({ text: '', backend: 'cpu' }) },
    npcs: { getNpc: (npcId) => getNpc(npcId) }
  }
}

function seedFixtureNpc(npcId: string): NpcRecord {
  return saveNpc({
    npcId,
    campaignId: `campaign-${npcId}`,
    worldId: `world-${npcId}`,
    regionId: 'region-default',
    civilizationId: `civ-${npcId}`,
    placeholder: {
      slotId: `${npcId}-slot`,
      civilizationId: `civ-${npcId}`,
      worldId: `world-${npcId}`,
      regionId: 'region-default',
      roleHint: 'resident',
      status: 'assigned',
      assignedNpcId: npcId
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
    combatStats: { kind: 'civilian', maxHp: 10, currentHp: 10 },
    factionIds: [],
    worldStatus: 'active',
    displayName: npcId
  })
}
