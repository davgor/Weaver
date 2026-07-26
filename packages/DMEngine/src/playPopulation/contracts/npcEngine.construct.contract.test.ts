import { afterEach, describe, expect, it } from 'vitest'
import { getNpc } from '@weaver/npc-engine'
import { resolvePlaceProposal } from '../resolvePlaceProposal.js'
import {
  bootLiveWorld,
  cleanupLivePopulationRoots,
  realLivePopulationDeps
} from './fixture.js'

afterEach(cleanupLivePopulationRoots)

describe('DMEngine -> NPCEngine live population contract', () => {
  it('constructs requested NPCs through NPCEngine public API', () => {
    const campaignId = 'campaign-npc-mint-contract'
    const { dataRoot, worldId } = bootLiveWorld(campaignId)

    const resolved = resolvePlaceProposal({
      proposalKey: 'npc-mint',
      worldId,
      campaignId,
      dataRoot,
      npcsToMint: 1
    }, realLivePopulationDeps())

    expect(resolved.npcIds).toEqual(['npc-mint.npc.1'])
    expect(getNpc('npc-mint.npc.1')?.civilizationId).toBe(resolved.civilizationId)
  })
})
