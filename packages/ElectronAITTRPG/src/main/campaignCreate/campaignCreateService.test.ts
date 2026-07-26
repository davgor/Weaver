import { describe, expect, it } from 'vitest'
import type { CampaignGenerationResult } from '@weaver/dm-engine'
import type { CampaignCreateDraft } from '../../shared/campaignCreate/types.js'
import {
  createCampaignCreateService,
  type CampaignCreateGenerationPort,
  type CampaignCreateService
} from './campaignCreateService.js'

describe('campaignCreateService generation', () => {
  it('starts generation from a validated draft and exposes review snapshot', async () => {
    const service = createTestService()
    const snapshot = await service.startGeneration(validDraft())

    expect(snapshot.status).toBe('ready')
    expect(snapshot.confirmed).toBe(false)
    expect(snapshot.campaignName).toBe('Lantern Roads')
    expect(snapshot.generativeTokensEnabled).toBe(true)
    expect(snapshot.regions).toHaveLength(2)
    expect(snapshot.npcs).toHaveLength(2)
    expect(snapshot.factions).toHaveLength(1)
    expect(snapshot.worldSummary).toContain('forest')
  })
})

describe('campaignCreateService review edits', () => {
  it('lets the player edit review fields before confirmation', async () => {
    const service = createTestService()
    await service.startGeneration(validDraft())

    const updated = await service.updateReviewField({
      section: 'world',
      field: 'worldSummary',
      value: 'Edited world summary.'
    })

    expect(updated.worldSummary).toBe('Edited world summary.')
    expect(updated.confirmed).toBe(false)
  })

  it('regenerates a section through DMEngine without confirming review', async () => {
    const service = createTestService()
    await service.startGeneration(validDraft())

    const regenerated = await service.regenerateSection({ section: 'pantheon' })

    expect(regenerated.pantheon).toContain('Alt pantheon')
    expect(regenerated.confirmed).toBe(false)
  })

  it('appends a generated NPC for a region', async () => {
    const service = createTestService()
    const initial = await service.startGeneration(validDraft())
    const regionId = initial.regions[0]?.regionId
    expect(regionId).toBeDefined()

    const withNpc = await service.generateRegionNpc({ regionId: regionId ?? '' })

    expect(withNpc.npcs.length).toBeGreaterThan(initial.npcs.length)
    expect(withNpc.npcs.some((npc) => npc.regionId === regionId)).toBe(true)
  })
})

describe('campaignCreateService gates', () => {
  it('confirms review and gates onboarding until then', async () => {
    const service = createTestService()
    await service.startGeneration(validDraft())

    await expect(service.assertCanContinue()).rejects.toThrow(/confirmed/i)

    const confirmed = await service.confirmReview()
    expect(confirmed.confirmed).toBe(true)
    await expect(service.assertCanContinue()).resolves.toBeUndefined()
  })

  it('keeps generative tokens scoped to campaign start', async () => {
    const service = createTestService()
    const snapshot = await service.startGeneration({
      ...validDraft(),
      generativeTokensEnabled: false
    })

    expect(snapshot.generativeTokensEnabled).toBe(false)
    await expect(
      service.updateReviewField({
        section: 'world',
        field: 'generativeTokensEnabled',
        value: 'true'
      })
    ).rejects.toThrow(/generative tokens/i)
  })

  it('returns null review before generation and rejects edits when not ready', async () => {
    const service = createTestService()
    expect(await service.getReview()).toBeNull()
    await expect(
      service.updateReviewField({ section: 'world', field: 'canon', value: 'x' })
    ).rejects.toThrow(/not ready/i)
  })

  it('records generation failures as error status', async () => {
    const service = createCampaignCreateService({
      generate: async () => {
        throw new Error('pipeline boom')
      },
      resolvePaths: (campaignId) => ({
        dataRoot: `/tmp/${campaignId}/data`,
        campaignFilePath: `/tmp/${campaignId}/campaign.sqlite`
      }),
      createCampaignId: () => 'campaign-fail'
    })
    const snapshot = await service.startGeneration(validDraft())
    expect(snapshot.status).toBe('error')
    expect(snapshot.errorMessage).toMatch(/pipeline boom/)
  })
})

describe('campaignCreateService field edits', () => {
  it('edits pantheon, bestiary, region, npc, and faction fields', async () => {
    const service = createTestService()
    const initial = await service.startGeneration(validDraft())
    await service.updateReviewField({
      section: 'pantheon',
      field: 'pantheon',
      value: 'Edited pantheon'
    })
    await service.updateReviewField({
      section: 'bestiary',
      field: 'bestiaryFlavor',
      value: 'Edited bestiary'
    })
    const regionId = initial.regions[0]?.regionId
    const npcId = initial.npcs[0]?.npcId
    const factionId = initial.factions[0]?.factionId
    expect(regionId).toBeDefined()
    expect(npcId).toBeDefined()
    expect(factionId).toBeDefined()
    await service.updateReviewField({
      section: 'regions',
      field: 'displayName',
      entityId: regionId as string,
      value: 'Named Region'
    })
    await service.updateReviewField({
      section: 'npcs',
      field: 'summary',
      entityId: npcId as string,
      value: 'Named NPC summary'
    })
    const updated = await service.updateReviewField({
      section: 'factions',
      field: 'purpose',
      entityId: factionId as string,
      value: 'Keep the roads'
    })
    expect(updated.pantheon).toBe('Edited pantheon')
    expect(updated.bestiaryFlavor).toBe('Edited bestiary')
    expect(updated.regions[0]?.displayName).toBe('Named Region')
    expect(updated.npcs[0]?.summary).toBe('Named NPC summary')
    expect(updated.factions[0]?.purpose).toBe('Keep the roads')
  })
})

describe('campaignCreateService regenerate', () => {
  it('regenerates world, regions, npcs, factions, and bestiary sections', async () => {
    const service = createTestService()
    await service.startGeneration(validDraft())
    await service.regenerateSection({ section: 'world' })
    await service.regenerateSection({ section: 'regions' })
    await service.regenerateSection({ section: 'npcs' })
    await service.regenerateSection({ section: 'factions' })
    const bestiary = await service.regenerateSection({ section: 'bestiary' })
    expect(bestiary.status).toBe('ready')
    expect(bestiary.confirmed).toBe(false)
  })

  it('rejects unknown region npc generation and missing entity ids', async () => {
    const service = createTestService()
    await service.startGeneration(validDraft())
    await expect(service.generateRegionNpc({ regionId: 'missing' })).rejects.toThrow(
      /Unknown region/
    )
    await expect(
      service.updateReviewField({ section: 'regions', field: 'summary', value: 'no id' })
    ).rejects.toThrow(/entityId/)
  })
})

function createTestService(): CampaignCreateService {
  const port: CampaignCreateGenerationPort = {
    generate: async (input) => {
      const variant = input.seed?.includes('regen') ? 'alt' : 'default'
      return fakeGenerationResult(input.campaignId, variant)
    },
    resolvePaths: (campaignId) => ({
      dataRoot: `/tmp/${campaignId}/data`,
      campaignFilePath: `/tmp/${campaignId}/campaign.sqlite`
    }),
    createCampaignId: () => 'campaign-test-1'
  }
  return createCampaignCreateService(port)
}

function validDraft(): CampaignCreateDraft {
  return {
    premise: 'Lantern roads wake under starlight.',
    name: 'Lantern Roads',
    deathMode: 'standard',
    regionCount: 2,
    npcsPerRegion: 1,
    generativeTokensEnabled: true
  }
}

function fakeGenerationResult(
  campaignId: string,
  variant: 'default' | 'alt'
): CampaignGenerationResult {
  const pantheon =
    variant === 'alt'
      ? 'Alt pantheon: river saints and ash bells.'
      : 'Pantheon: lantern, river, and ash saints.'
  return {
    campaignId,
    seed: 'seed-a',
    worldId: `${campaignId}-world`,
    stages: [],
    canon: 'Canon: keep the moon roads true.',
    pantheon,
    worldSummary: 'World: forest highlands around moon roads.',
    factions: [{ factionId: 'faction-1', name: 'Lantern Cartographers', memberships: [] }],
    regions: [region('region-1', campaignId), region('region-2', campaignId)],
    civilizations: [],
    npcs: [
      npc('npc-1', campaignId, 'region-1', 'Mira Bell'),
      npc('npc-2', campaignId, 'region-2', 'Orren Vale')
    ],
    foes: [],
    bestiaryFlavor: 'Bestiary: goblins fear the road bells.',
    storyPremise: 'Story: recover the first lantern.',
    campaign: {
      campaignId,
      filePath: `/tmp/${campaignId}/campaign.sqlite`,
      schemaVersion: 1,
      appliedMigrations: [1]
    },
    catalogEntries: []
  }
}

function region(regionId: string, worldId: string) {
  return {
    regionId,
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
    bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
    centroid: { x: 0.5, y: 0.5 },
    statsVersion: 1,
    extraStats: {},
    displayName: regionId,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  }
}

function npc(npcId: string, campaignId: string, regionId: string, displayName: string) {
  return {
    npcId,
    campaignId,
    worldId: `${campaignId}-world`,
    regionId,
    civilizationId: 'civ-1',
    placeholder: {
      slotId: `${regionId}:1`,
      civilizationId: 'civ-1',
      worldId: `${campaignId}-world`,
      regionId,
      roleHint: 'resident' as const,
      status: 'assigned' as const,
      assignedNpcId: npcId
    },
    identity: {
      race: {
        campaignId,
        characterId: npcId,
        raceId: 'human',
        name: 'Human',
        lore: 'Common folk of the roads.'
      },
      alignment: 'neutral',
      temperament: 'curious',
      nonSpeaking: false
    },
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    abilityModifiers: { Body: 0, Agility: 0, Mind: 0, Presence: 0 },
    speciesKind: 'person' as const,
    combatStats: { kind: 'civilian' as const, maxHp: 10, currentHp: 10 },
    factionIds: [],
    displayName,
    dialogueFlavor: `${displayName} watches the roads.`
  }
}
