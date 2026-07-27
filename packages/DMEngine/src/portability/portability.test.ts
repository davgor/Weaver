import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearCompanionStore, setCampaignDay } from '@weaver/character-engine'
import { createCivilizationStore } from '@weaver/civilization-engine'
import { clearEnemyStore } from '@weaver/enemy-engine'
import { itemEngine } from '@weaver/item-engine'
import { clearNpcStore } from '@weaver/npc-engine'
import {
  clearQuestStores,
  listWorldQuests,
  QUEST_SLICE_VERSION
} from '@weaver/quest-engine'
import { createRegionStore } from '@weaver/regional-engine'
import { createWorldService } from '@weaver/world-engine'
import {
  createDefaultCampaignImportDeps,
  createMemoryOnboardingStore,
  exportCampaignPackage,
  exportOnboardingCampaignSlice,
  importOnboardingCampaignSlice,
  importCampaignPackage,
  ONBOARDING_CAMPAIGN_SLICE_VERSION,
  PortabilitySchemaError
} from './index.js'
import { seedCampaign } from './seedCampaignForTest.js'
import { PORTABLE_PACKAGE_VERSION } from './schemaVersion.js'
import type { CampaignPortablePackage } from './types.js'

const roots: string[] = []
const CAMPAIGN_ID = 'campaign-round-trip'

beforeEach(() => {
  clearNpcStore()
  clearEnemyStore()
  clearCompanionStore()
  clearQuestStores()
  setCampaignDay(CAMPAIGN_ID, 0)
  itemEngine.restoreCampaignBalances({})
})

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine campaign portability round-trip', () => {
  it('reproduces an equivalent campaign with seeded quests', () => {
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)
    const deps = createDefaultCampaignImportDeps()
    const exported = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(exported.version).toBe(PORTABLE_PACKAGE_VERSION)
    expect(exported.slices.world.worldId).toBe(CAMPAIGN_ID)
    expect(exported.slices.quest.sliceVersion).toBe(QUEST_SLICE_VERSION)
    expect(exported.slices.quest.worldQuests.length).toBeGreaterThan(0)

    clearCampaignState(dataRoot, CAMPAIGN_ID)
    expect(listWorldQuests(CAMPAIGN_ID)).toEqual([])
    importCampaignPackage(deps, { dataRoot, package: exported })
    expect(listWorldQuests(CAMPAIGN_ID)).toEqual(exported.slices.quest.worldQuests)
    const restored = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    assertRoundTripEquivalent(exported, restored)
  })

  it('round-trips an empty quest slice', () => {
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID, { seedQuests: false })
    const deps = createDefaultCampaignImportDeps()
    const exported = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(exported.slices.quest.worldQuests).toEqual([])
    clearCampaignState(dataRoot, CAMPAIGN_ID)
    importCampaignPackage(deps, { dataRoot, package: exported })
    expect(listWorldQuests(CAMPAIGN_ID)).toEqual([])
  })

})

describe('DMEngine campaign onboarding portability', () => {
  it('round-trips in-progress onboarding and guided creation state', () => {
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)
    const sourceStore = createMemoryOnboardingStore()
    seedOnboardingSlice(sourceStore)

    const exported = exportCampaignPackage(onboardingDeps(sourceStore), {
      dataRoot,
      campaignId: CAMPAIGN_ID
    })
    expect(exported.version).toBe(PORTABLE_PACKAGE_VERSION)
    expect(exported.slices.onboarding.sliceVersion).toBe(ONBOARDING_CAMPAIGN_SLICE_VERSION)

    const restoredStore = createMemoryOnboardingStore()
    importCampaignPackage(onboardingDeps(restoredStore), { dataRoot, package: exported })
    assertOnboardingSliceRestored(restoredStore)
  })
})

describe('DMEngine campaign portability versions', () => {
  it('adapts v1 packages by inserting an empty quest slice', () => {
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)
    const deps = createDefaultCampaignImportDeps()
    const current = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    const v1Package = toV1Package(current)
    clearCampaignState(dataRoot, CAMPAIGN_ID)
    importCampaignPackage(deps, { dataRoot, package: v1Package })
    expect(listWorldQuests(CAMPAIGN_ID)).toEqual([])
    const restored = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(restored.version).toBe(PORTABLE_PACKAGE_VERSION)
    expect(restored.slices.quest).toEqual({
      sliceVersion: QUEST_SLICE_VERSION,
      campaignId: CAMPAIGN_ID,
      worldQuests: []
    })
  })

  it('reports campaignId mismatch across slices', () => {
    const deps = createDefaultCampaignImportDeps()
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)
    const exported = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    const mismatched = withSliceCampaignId(exported, 'quest', 'wrong-campaign')
    expect(() => importCampaignPackage(deps, { dataRoot, package: mismatched })).toThrow(
      PortabilitySchemaError
    )
    expect(() => importCampaignPackage(deps, { dataRoot, package: mismatched })).toThrow(
      /campaignId mismatch/
    )
  })

  it('reports unsupported package versions clearly', () => {
    const deps = createDefaultCampaignImportDeps()
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)
    const exported = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(() =>
      importCampaignPackage(deps, { dataRoot, package: { ...exported, version: 99 } })
    ).toThrow(PortabilitySchemaError)
    expect(() =>
      importCampaignPackage(deps, { dataRoot, package: { ...exported, version: 99 } })
    ).toThrow(/Unsupported portable package version/)
  })
})

function withSliceCampaignId(
  exported: ReturnType<typeof exportCampaignPackage>,
  sliceKey: keyof CampaignPortablePackage['slices'],
  campaignId: string
): ReturnType<typeof exportCampaignPackage> {
  return {
    ...exported,
    slices: {
      ...exported.slices,
      [sliceKey]: {
        ...exported.slices[sliceKey],
        campaignId
      }
    }
  }
}

function toV1Package(current: CampaignPortablePackage): {
  version: 1
  campaignId: string
  exportedAt: string
  slices: Omit<CampaignPortablePackage['slices'], 'quest' | 'onboarding' | 'narration'>
} {
  return {
    version: 1,
    campaignId: current.campaignId,
    exportedAt: current.exportedAt,
    slices: {
      world: current.slices.world,
      regional: current.slices.regional,
      civilization: current.slices.civilization,
      npc: current.slices.npc,
      enemy: current.slices.enemy,
      character: current.slices.character,
      item: current.slices.item
    }
  }
}

function assertRoundTripEquivalent(
  exported: ReturnType<typeof exportCampaignPackage>,
  restored: ReturnType<typeof exportCampaignPackage>
): void {
  expect(restored.slices.world.meta).toMatchObject({
    worldId: exported.slices.world.meta.worldId,
    seed: exported.slices.world.meta.seed,
    bounds: exported.slices.world.meta.bounds,
    cellCount: exported.slices.world.meta.cellCount
  })
  expect(restored.slices.regional.regions.map((entry) => entry.record.regionId)).toEqual(
    exported.slices.regional.regions.map((entry) => entry.record.regionId)
  )
  expect(
    restored.slices.civilization.civilizations.map((entry) => entry.record.civilizationId)
  ).toEqual(exported.slices.civilization.civilizations.map((entry) => entry.record.civilizationId))
  expect(restored.slices.npc.npcIds.sort()).toEqual(exported.slices.npc.npcIds.sort())
  expect(restored.slices.enemy.generatedFoes.map((foe) => foe.foeId)).toEqual(
    exported.slices.enemy.generatedFoes.map((foe) => foe.foeId)
  )
  expect(restored.slices.character.day).toBe(exported.slices.character.day)
  expect(restored.slices.character.characterIds).toEqual(exported.slices.character.characterIds)
  expect(restored.slices.item.balances).toEqual(exported.slices.item.balances)
  expect(restored.slices.quest.worldQuests).toEqual(exported.slices.quest.worldQuests)
  expect(restored.slices.narration).toEqual(exported.slices.narration)
  expect(restored.slices.onboarding).toEqual(exported.slices.onboarding)
}

function onboardingDeps(store: ReturnType<typeof createMemoryOnboardingStore>) {
  return createDefaultCampaignImportDeps({
    onboarding: {
      exportCampaignSlice: (ctx) => exportOnboardingCampaignSlice(ctx, store),
      importCampaignSlice: (ctx, slice) => importOnboardingCampaignSlice(ctx, slice, store)
    }
  })
}

function seedOnboardingSlice(store: ReturnType<typeof createMemoryOnboardingStore>): void {
  store.saveRecord({
    campaignId: CAMPAIGN_ID,
    characterId: 'pc-onboarding',
    characterName: 'Ilyra',
    phase: 'guided_identity',
    selections: { archetype: 'Ranger', raceId: 'elf' }
  })
  store.saveGuidedState({
    campaignId: CAMPAIGN_ID,
    characterId: 'pc-onboarding',
    guidedCreationPhase: 'why',
    transcript: [{ speaker: 'player', phase: 'who', text: 'I carry a lantern.' }],
    characterFacts: { oath: 'carry the lantern' },
    enterWorldUnlocked: false
  })
  store.setActiveCharacterId('pc-onboarding')
}

function assertOnboardingSliceRestored(
  store: ReturnType<typeof createMemoryOnboardingStore>
): void {
  expect(store.loadRecord('pc-onboarding')).toMatchObject({
    phase: 'guided_identity',
    selections: { archetype: 'Ranger', raceId: 'elf' }
  })
  expect(store.loadGuidedState('pc-onboarding')?.transcript[0]?.text).toBe('I carry a lantern.')
  expect(store.getActiveCharacterId()).toBe('pc-onboarding')
}

function clearCampaignState(dataRoot: string, campaignId: string): void {
  const worldId = campaignId
  createWorldService(dataRoot).deleteWorld(worldId)
  createRegionStore(dataRoot).clearRegions(worldId)
  createCivilizationStore(dataRoot).clearCivilizations(worldId)
  clearNpcStore()
  clearEnemyStore()
  clearCompanionStore()
  clearQuestStores()
  setCampaignDay(campaignId, 0)
  itemEngine.restoreCampaignBalances({})
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-portability-'))
  roots.push(root)
  return root
}
