import { afterEach, describe, expect, it } from 'vitest'
import { regionalEngine } from '@weaver/regional-engine'
import { bindWorldReader, resolvePlaceProposal } from '../resolvePlaceProposal.js'
import {
  bootLiveWorld,
  cleanupLivePopulationRoots,
  realLivePopulationDeps
} from './fixture.js'

afterEach(cleanupLivePopulationRoots)

describe('DMEngine -> RegionalEngine live population contract', () => {
  it('mints a region through RegionalEngine public fill API', () => {
    const campaignId = 'campaign-regional-mint-contract'
    const { dataRoot, worldId } = bootLiveWorld(campaignId)

    const resolved = resolvePlaceProposal({
      proposalKey: 'regional-mint',
      worldId,
      campaignId,
      dataRoot
    }, realLivePopulationDeps())

    const options = { dataRoot, world: bindWorldReader(dataRoot, realLivePopulationDeps()) }
    expect(regionalEngine.getRegion(options, worldId, resolved.regionId)?.regionId).toBe(resolved.regionId)
  })
})
