import { describe, expect, it } from 'vitest'
import { runCampaignGeneration } from './pipeline.js'
import { CAMPAIGN_GENERATION_STAGES } from './types.js'
import type {
  CampaignGenerationDeps,
  CampaignGenerationInput,
  CampaignGenerationStageId
} from './types.js'

describe('campaign generation pipeline stage flow', () => {
  it('runs every stage in strict campaign generation order', async () => {
    const calls: CampaignGenerationStageId[] = []
    const result = await runCampaignGeneration(baseInput(), fakeDeps({
      onFill(input) {
        calls.push(input.stage)
        return stageBlocks(input.stage)
      }
    }))

    expect(calls).toEqual([...CAMPAIGN_GENERATION_STAGES])
    expect(result.stages.map((stage) => stage.stage)).toEqual([...CAMPAIGN_GENERATION_STAGES])
  })

  it('retries a stage by re-invoking NarrationEngine before persisting validated output', async () => {
    let canonAttempts = 0
    const deps = fakeDeps({
      onFill(input) {
        if (input.stage === 'canon' && canonAttempts === 0) {
          canonAttempts += 1
          return { ok: false, filled: {}, errors: ['missing CANON'] }
        }
        return stageBlocks(input.stage)
      }
    })

    const result = await runCampaignGeneration(baseInput(), deps)

    expect(result.canon).toContain('Canon')
    expect(canonAttempts).toBe(1)
    expect(deps.world.calls).toHaveLength(1)
  })

})

describe('campaign generation pipeline persistence gating', () => {
  it('respects regionCount and npcsPerRegion parameters', async () => {
    const input = { ...baseInput(), regionCount: 3, npcsPerRegion: 2 }
    const deps = fakeDeps()

    const result = await runCampaignGeneration(input, deps)

    expect(result.regions).toHaveLength(3)
    expect(result.npcs).toHaveLength(6)
    expect(deps.civilization.placeholderRequests).toEqual([
      { regionId: 'region-1', count: 2 },
      { regionId: 'region-2', count: 2 },
      { regionId: 'region-3', count: 2 }
    ])
  })

  it('never persists unvalidated stage content', async () => {
    const deps = fakeDeps({
      onFill(input) {
        if (input.stage === 'world') {
          return { ok: false, filled: { WORLD_SUMMARY: 'unvalidated' }, errors: ['invalid'] }
        }
        return stageBlocks(input.stage)
      }
    })

    await expect(runCampaignGeneration(baseInput(), deps)).rejects.toThrow(/world/i)
    expect(deps.world.calls).toHaveLength(0)
    expect(deps.campaign.created).toHaveLength(0)
  })
})

function baseInput(): CampaignGenerationInput {
  return {
    campaignId: 'campaign-test',
    dataRoot: '/tmp/weaver-campaign-gen-test',
    campaignFilePath: '/tmp/weaver-campaign-gen-test/campaign.sqlite',
    regionCount: 2,
    npcsPerRegion: 1,
    seed: 'seed-a',
    premise: 'Ancient roads wake under starlight.'
  }
}

type FakeOptions = {
  onFill?: (input: NarrationFillInput) => ReturnType<typeof stageBlocks>
}

type NarrationFillInput = Parameters<CampaignGenerationDeps['narration']['fillAndValidate']>[0]

type TrackingDeps = CampaignGenerationDeps & {
  world: CampaignGenerationDeps['world'] & { calls: string[] }
  civilization: CampaignGenerationDeps['civilization'] & {
    placeholderRequests: PlaceholderRequest[]
  }
  campaign: CampaignGenerationDeps['campaign'] & { created: string[] }
}

type PlaceholderRequest = { regionId: string; count: number }

function fakeDeps(options: FakeOptions = {}): TrackingDeps {
  const placeholderRequests: PlaceholderRequest[] = []
  return {
    narration: {
      fillAndValidate: async (input) => options.onFill?.(input) ?? stageBlocks(input.stage)
    },
    completer: {
      async completeText() {
        return { text: '', backend: 'unit' }
      }
    },
    world: fakeWorld(),
    regional: fakeRegional(),
    civilization: fakeCivilization(placeholderRequests),
    npc: fakeNpc(),
    enemy: {
      listBestiary: () => [],
      generateEncounterFoes: () => []
    },
    campaign: fakeCampaign()
  }
}

function fakeWorld(): TrackingDeps['world'] {
  const calls: string[] = []
  return {
    calls,
    createWorld: (dataRoot, opts) => {
      calls.push(`${dataRoot}:${opts?.worldId ?? 'world'}`)
      return { meta: worldMeta(opts?.worldId ?? 'world-test'), expansion0: expansion0(opts?.worldId) }
    },
    getWorldMeta: (_dataRoot, worldId) => worldMeta(worldId),
    getWorldBounds: () => bounds(),
    getExpansion: () => null,
    getCell: (args) => ({ x: args.x, y: args.y, elevation: 0.4, landType: 'forest' }),
    getWorldSpecific: () => []
  }
}

function fakeRegional(): CampaignGenerationDeps['regional'] {
  return {
    fillRegions: (_options, worldId) => makeRegions(worldId, 5),
    getRegion: (_options, worldId, regionId) =>
      makeRegions(worldId, 5).find((region) => region.regionId === regionId) ?? null,
    getRegionSummary: (_options, worldId, regionId) => {
      const region = makeRegions(worldId, 5).find((entry) => entry.regionId === regionId)
      return region ? { ...region } : null
    },
    getRegionCells: () => [{ x: 0, y: 0 }],
    listRegions: (_options, worldId) => makeRegions(worldId, 5),
    getRegionsInBounds: (_options, worldId) => makeRegions(worldId, 5)
  }
}

function fakeCivilization(requests: PlaceholderRequest[]): TrackingDeps['civilization'] {
  return {
    fillCivilizations: (_options, worldId, scope) =>
      (scope?.regionIds ?? []).map((regionId, index) => makeCivilization(worldId, regionId, index + 1)),
    ensureNpcPlaceholders: (input) => {
      requests.push({ regionId: input.regionId, count: input.roleHints.length })
      return input.roleHints.map((roleHint, index) => ({
        slotId: `${input.regionId}:${index + 1}`,
        civilizationId: input.civilizationId,
        worldId: input.worldId,
        regionId: input.regionId,
        roleHint,
        status: 'unassigned'
      }))
    },
    placeholderRequests: requests
  }
}

function fakeNpc(): CampaignGenerationDeps['npc'] {
  return {
    constructNpc: (input) => ({
      npcId: input.npcId,
      campaignId: input.campaignId,
      worldId: input.worldId,
      regionId: 'region-1',
      civilizationId: 'civ-1',
      placeholder: assignedPlaceholder(input.placeholderSlotId, input.worldId, input.npcId),
      identity: {
        race: { raceId: input.raceId, name: 'Human' },
        alignment: input.alignment,
        temperament: input.temperament,
        nonSpeaking: false
      },
      abilityScores: input.abilityScores,
      abilityModifiers: { Body: 0, Agility: 0, Mind: 0, Presence: 0 },
      speciesKind: 'person',
      combatStats: { kind: 'civilian', maxHp: 10, currentHp: 10 },
      factionIds: [],
      displayName: input.displayName
    }),
    createFaction: (input) => ({ factionId: input.factionId, name: input.name, memberships: [] }),
    addNpcToFaction: (input) => ({
      factionId: input.factionId,
      name: input.factionId,
      memberships: [{ npcId: input.npcId }]
    })
  }
}

function fakeCampaign(): TrackingDeps['campaign'] {
  const created: string[] = []
  return {
    created,
    createCampaign: (options) => {
      created.push(options.campaignId)
      options.seedCatalog?.({ campaignId: options.campaignId, schemaVersion: 1, catalog: { upsert() {} } })
      return {
        campaignId: options.campaignId,
        filePath: options.filePath,
        schemaVersion: 1,
        appliedMigrations: [1],
        close() {}
      }
    }
  }
}

function stageBlocks(stage: CampaignGenerationStageId) {
  const filled = {
    canon: { CANON: 'Canon: keep the moon roads true.' },
    pantheon: { PANTHEON: 'Pantheon: lantern, river, and ash saints.' },
    world: { WORLD_SUMMARY: 'World: forest highlands around moon roads.' },
    factions: { FACTION_NAME: 'Lantern Cartographers', FACTION_PURPOSE: 'Map waking roads.' },
    regions: { REGION_GUIDANCE: 'Regions: emphasize forest crossings.' },
    npcs: { NPC_STYLE: 'Name: Road Warden\nTemperament: curious\nRole: scout' },
    bestiary: { BESTIARY_FLAVOR: 'Bestiary: goblins fear the road bells.' },
    story: { STORY_PREMISE: 'Story: recover the first lantern.' },
    persist: { PERSIST_SUMMARY: 'Persist: campaign ready.' }
  }[stage]
  return { ok: true, filled, filledText: Object.values(filled).join('\n'), errors: [] }
}

function worldMeta(worldId: string) {
  return {
    worldId,
    seed: 1,
    bounds: bounds(),
    noise: { frequency: 0.1, octaves: 1, persistence: 0.5, lacunarity: 2 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    cellCount: 16
  }
}

function expansion0(worldId: string | undefined) {
  const resolvedWorldId = worldId ?? 'world-test'
  return {
    expansionId: 'expansion_0',
    worldId: resolvedWorldId,
    sequence: 0,
    addedBounds: bounds(),
    previousBounds: null,
    resultingBounds: bounds(),
    createdAt: '2026-01-01T00:00:00.000Z',
    cellCount: 16
  }
}

function bounds() {
  return { minX: 0, minY: 0, maxX: 3, maxY: 3 }
}

function assignedPlaceholder(slotId: string, worldId: string, npcId: string) {
  return {
    slotId,
    civilizationId: 'civ-1',
    worldId,
    regionId: 'region-1',
    roleHint: 'resident' as const,
    status: 'assigned' as const,
    assignedNpcId: npcId
  }
}

function makeRegions(worldId: string, count: number) {
  return Array.from({ length: count }, (_, index) => ({
    regionId: `region-${index + 1}`,
    worldId,
    dominantLandType: 'forest' as const,
    landTypeHistogram: { forest: 4 },
    averageElevation: 0.4,
    minElevation: 0.2,
    maxElevation: 0.8,
    waterContent: 0.1,
    isOcean: false,
    touchesOcean: false,
    isLandlocked: true,
    cellCount: 4,
    bounds: { minX: 0, minY: index, maxX: 1, maxY: index },
    centroid: { x: 0.5, y: index },
    statsVersion: 1,
    extraStats: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }))
}

function makeCivilization(worldId: string, regionId: string, index: number) {
  return {
    civilizationId: `civ-${index}`,
    worldId,
    regionId,
    kind: 'village' as const,
    origin: { x: index, y: index },
    bounds: { minX: index, minY: index, maxX: index, maxY: index },
    seedSalt: index,
    population: 50,
    npcSlotCount: 1,
    npcSlotsAssigned: 0,
    statsVersion: 1,
    extraStats: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}
