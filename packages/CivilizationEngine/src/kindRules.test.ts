import { describe, expect, it } from 'vitest'
import { capacityForKind, eligibleKinds, evaluateKindRules, slotTargetForPopulation } from './kindRules.js'
import type { RegionSummary } from './types.js'

function summary(overrides: Partial<RegionSummary> = {}): RegionSummary {
  return {
    regionId: 'r1',
    worldId: 'w1',
    dominantLandType: 'grassland',
    landTypeHistogram: { grassland: 40 },
    averageElevation: 0.5,
    minElevation: 0.4,
    maxElevation: 0.6,
    waterContent: 0.05,
    isOcean: false,
    touchesOcean: true,
    isLandlocked: false,
    cellCount: 48,
    bounds: { minX: 0, minY: 0, maxX: 7, maxY: 5 },
    centroid: { x: 3.5, y: 2.5 },
    statsVersion: 1,
    extraStats: {},
    ...overrides
  }
}

describe('CivilizationEngine kind rules', () => {
  it('rejects ocean regions for every settlement kind', () => {
    const rules = evaluateKindRules(summary({ isOcean: true, cellCount: 20, waterContent: 1 }))
    expect(rules.every((rule) => rule.eligible === false)).toBe(true)
    expect(eligibleKinds(summary({ isOcean: true }))).toEqual([])
  })

  it('unlocks farmHouse through city from RegionalEngine summary facts', () => {
    const coastal = summary()
    expect(eligibleKinds(coastal)).toEqual([
      'farmHouse',
      'hamlet',
      'village',
      'castle',
      'city'
    ])
    expect(capacityForKind(coastal, 'city').minPopulation).toBe(200)

    const inlandSmall = summary({
      cellCount: 10,
      waterContent: 0,
      isLandlocked: true,
      touchesOcean: false,
      averageElevation: 0.4
    })
    expect(eligibleKinds(inlandSmall)).toEqual(['farmHouse', 'hamlet'])
  })

  it('computes deterministic slot targets from population bands', () => {
    const village = capacityForKind(summary(), 'village')
    expect(slotTargetForPopulation(village, 50)).toBeGreaterThan(0)
    expect(slotTargetForPopulation(village, 0)).toBe(0)
  })
})
