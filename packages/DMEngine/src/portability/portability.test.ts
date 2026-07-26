import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearCompanionStore,
  exportCharacterCampaignSlice,
  restoreCompanionsForCampaign,
  setCampaignDay
} from '@weaver/character-engine'
import { createCivilizationStore } from '@weaver/civilization-engine'
import { clearEnemyStore, saveGeneratedFoe } from '@weaver/enemy-engine'
import { itemEngine } from '@weaver/item-engine'
import { clearNpcStore, saveNpc } from '@weaver/npc-engine'
import { createRegionStore } from '@weaver/regional-engine'
import { createWorldService } from '@weaver/world-engine'
import {
  createDefaultCampaignImportDeps,
  exportCampaignPackage,
  importCampaignPackage,
  PortabilitySchemaError
} from './index.js'
import { PORTABLE_PACKAGE_VERSION } from './schemaVersion.js'

const roots: string[] = []
const CAMPAIGN_ID = 'campaign-round-trip'

beforeEach(() => {
  clearNpcStore()
  clearEnemyStore()
  clearCompanionStore()
  setCampaignDay(CAMPAIGN_ID, 0)
  itemEngine.restoreCampaignBalances({})
})

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { recursive: true, force: true })
  }
})

describe('DMEngine campaign portability', () => {
  it('export then import reproduces an equivalent campaign', () => {
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)

    const deps = createDefaultCampaignImportDeps()
    const exported = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(exported.version).toBe(PORTABLE_PACKAGE_VERSION)
    expect(exported.slices.world.worldId).toBe(CAMPAIGN_ID)

    clearCampaignState(dataRoot, CAMPAIGN_ID)
    importCampaignPackage(deps, { dataRoot, package: exported })

    const restored = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(restored.slices.world.meta).toMatchObject({
      worldId: exported.slices.world.meta.worldId,
      seed: exported.slices.world.meta.seed,
      bounds: exported.slices.world.meta.bounds,
      cellCount: exported.slices.world.meta.cellCount
    })
    expect(restored.slices.regional.regions.map((entry) => entry.record.regionId)).toEqual(
      exported.slices.regional.regions.map((entry) => entry.record.regionId)
    )
    expect(restored.slices.civilization.civilizations.map((entry) => entry.record.civilizationId)).toEqual(
      exported.slices.civilization.civilizations.map((entry) => entry.record.civilizationId)
    )
    expect(restored.slices.npc.npcIds.sort()).toEqual(exported.slices.npc.npcIds.sort())
    expect(restored.slices.enemy.generatedFoes.map((foe) => foe.foeId)).toEqual(
      exported.slices.enemy.generatedFoes.map((foe) => foe.foeId)
    )
    expect(restored.slices.character.day).toBe(exported.slices.character.day)
    expect(restored.slices.character.characterIds).toEqual(exported.slices.character.characterIds)
    expect(restored.slices.item.balances).toEqual(exported.slices.item.balances)
  })

  it('reports unsupported package versions clearly', () => {
    const deps = createDefaultCampaignImportDeps()
    const dataRoot = tempRoot()
    seedCampaign(dataRoot, CAMPAIGN_ID)
    const exported = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })

    expect(() =>
      importCampaignPackage(deps, {
        dataRoot,
        package: { ...exported, version: 99 }
      })
    ).toThrow(PortabilitySchemaError)
    expect(() =>
      importCampaignPackage(deps, {
        dataRoot,
        package: { ...exported, version: 99 }
      })
    ).toThrow(/Unsupported portable package version/)
  })
})

function seedCampaign(dataRoot: string, campaignId: string): void {
  const worldId = campaignId
  const world = createWorldService(dataRoot)
  world.createWorld({
    worldId,
    seed: 11,
    bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 }
  })

  const regions = createRegionStore(dataRoot)
  const timestamp = '2026-01-01T00:00:00.000Z'
  regions.saveRegion(
    {
      regionId: 'region-core',
      worldId,
      dominantLandType: 'grassland',
      landTypeHistogram: { grassland: 4 },
      averageElevation: 0.3,
      minElevation: 0.2,
      maxElevation: 0.4,
      waterContent: 0,
      isOcean: false,
      touchesOcean: false,
      isLandlocked: true,
      cellCount: 4,
      bounds: { minX: 0, minY: 0, maxX: 1, maxY: 1 },
      centroid: { x: 0.5, y: 0.5 },
      statsVersion: 1,
      extraStats: {},
      displayName: 'Core',
      createdAt: timestamp,
      updatedAt: timestamp
    },
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]
  )

  const civ = createCivilizationStore(dataRoot)
  civ.saveCivilization(
    {
      civilizationId: 'civ-core',
      worldId,
      regionId: 'region-core',
      kind: 'hamlet',
      origin: { x: 0, y: 0 },
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      seedSalt: 1,
      population: 50,
      npcSlotCount: 0,
      npcSlotsAssigned: 0,
      statsVersion: 1,
      extraStats: {},
      displayName: 'Core Hamlet',
      createdAt: timestamp,
      updatedAt: timestamp
    },
    [{ x: 0, y: 0 }]
  )

  saveNpc({
    npcId: 'npc-guide',
    campaignId,
    worldId,
    regionId: 'region-core',
    civilizationId: 'civ-core',
    placeholder: {
      slotId: 'slot-guide',
      civilizationId: 'civ-core',
      worldId,
      regionId: 'region-core',
      roleHint: 'merchant',
      status: 'assigned',
      assignedNpcId: 'npc-guide'
    },
    identity: {
      race: { raceId: 'human', name: 'Human' },
      alignment: 'neutral',
      temperament: 'helpful',
      nonSpeaking: false
    },
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    abilityModifiers: { Body: 0, Agility: 0, Mind: 0, Presence: 0 },
    speciesKind: 'person',
    combatStats: { kind: 'civilian', maxHp: 10, currentHp: 10 },
    factionIds: []
  })

  saveGeneratedFoe({
    foeId: 'foe-scout',
    bestiaryId: 'goblin-skirmisher',
    difficulty: 'easy',
    tags: ['scout'],
    regionId: 'region-core'
  })

  setCampaignDay(campaignId, 2)
  restoreCompanionsForCampaign([
    {
      characterId: 'companion-guide',
      ownerCharacterId: 'pc-owner',
      campaignId,
      name: 'Scout',
      isCompanion: true,
      archetype: 'Ranger'
    }
  ])
  itemEngine.credit('companion-guide', 15)
  expect(exportCharacterCampaignSlice({ campaignId }).characterIds).toContain('companion-guide')
}

function clearCampaignState(dataRoot: string, campaignId: string): void {
  const worldId = campaignId
  createWorldService(dataRoot).deleteWorld(worldId)
  createRegionStore(dataRoot).clearRegions(worldId)
  createCivilizationStore(dataRoot).clearCivilizations(worldId)
  clearNpcStore()
  clearEnemyStore()
  clearCompanionStore()
  setCampaignDay(campaignId, 0)
  itemEngine.restoreCampaignBalances({})
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-portability-'))
  roots.push(root)
  return root
}
