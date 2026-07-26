import { afterEach, describe, expect, it } from 'vitest'
import { civilizationEngine } from '@weaver/civilization-engine'
import { bindWorldReader, resolvePlaceProposal } from '../resolvePlaceProposal.js'
import {
  bootLiveWorld,
  cleanupLivePopulationRoots,
  realLivePopulationDeps
} from './fixture.js'

afterEach(cleanupLivePopulationRoots)

describe('DMEngine -> CivilizationEngine live population contract', () => {
  it('mints a settlement through CivilizationEngine public fill API', () => {
    const campaignId = 'campaign-civ-mint-contract'
    const { dataRoot, worldId } = bootLiveWorld(campaignId)
    const deps = realLivePopulationDeps()

    const resolved = resolvePlaceProposal({
      proposalKey: 'civ-mint',
      worldId,
      campaignId,
      dataRoot
    }, deps)

    const world = bindWorldReader(dataRoot, deps)
    const regionalOptions = { dataRoot, world }
    const options = {
      dataRoot,
      world,
      regional: {
        getRegion: (worldId: string, regionId: string) =>
          deps.regional.getRegion(regionalOptions, worldId, regionId),
        getRegionSummary: (worldId: string, regionId: string) =>
          deps.regional.getRegionSummary(regionalOptions, worldId, regionId),
        getRegionCells: (worldId: string, regionId: string) =>
          deps.regional.getRegionCells(regionalOptions, worldId, regionId),
        listRegions: (worldId: string) => deps.regional.listRegions(regionalOptions, worldId),
        getRegionsInBounds: (worldId: string, bounds: Parameters<typeof deps.regional.getRegionsInBounds>[2]) =>
          deps.regional.getRegionsInBounds(regionalOptions, worldId, bounds)
      }
    }

    expect(
      civilizationEngine.getCivilization(options, worldId, resolved.civilizationId)?.civilizationId
    ).toBe(resolved.civilizationId)
  })
})
