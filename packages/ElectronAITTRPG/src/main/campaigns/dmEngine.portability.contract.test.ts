import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  exportCharacterCampaignSlice,
  restoreCompanionsForCampaign,
  setCampaignDay
} from '@weaver/character-engine'
import { createCivilizationStore } from '@weaver/civilization-engine'
import { clearEnemyStore, saveGeneratedFoe } from '@weaver/enemy-engine'
import { itemEngine } from '@weaver/item-engine'
import { clearNpcStore, saveNpc } from '@weaver/npc-engine'
import { clearQuestStores, seedWorldQuests } from '@weaver/quest-engine'
import { createRegionStore } from '@weaver/regional-engine'
import { createWorldService } from '@weaver/world-engine'
import {
  createDefaultCampaignImportDeps,
  exportCampaignPackage,
  getActiveCampaignSession
} from '@weaver/dm-engine'
import {
  invokeExportCampaignPackage,
  invokeImportCampaignPackage
} from './campaignPortability.js'
import { ensureCampaignLayout } from './campaignDisk.js'

const roots: string[] = []
const CAMPAIGN_ID = 'electron-portability-contract'
const TIMESTAMP = '2026-01-01T00:00:00.000Z'

beforeEach(() => {
  getActiveCampaignSession()?.close()
  clearNpcStore()
  clearEnemyStore()
  clearQuestStores()
  setCampaignDay(CAMPAIGN_ID, 0)
  itemEngine.restoreCampaignBalances({})
})

afterEach(() => {
  getActiveCampaignSession()?.close()
  while (roots.length > 0) {
    const root = roots.pop()
    if (root === undefined) continue
    try {
      rmSync(root, { force: true, recursive: true })
    } catch {
      // Windows CI can briefly lock sqlite files after session close.
    }
  }
})

describe('DMEngine campaign portability contract (097)', () => {
  it('invokes export and import through the Electron adapter', () => {
    const campaignsRoot = tempRoot()
    ensureCampaignLayout(campaignsRoot, CAMPAIGN_ID)
    const dataRoot = join(campaignsRoot, CAMPAIGN_ID, 'data')
    seedContractCampaign(dataRoot, CAMPAIGN_ID)

    const exported = invokeExportCampaignPackage(campaignsRoot, CAMPAIGN_ID)
    expect(exported.campaignId).toBe(CAMPAIGN_ID)

    clearCampaignState(dataRoot, CAMPAIGN_ID)
    const imported = invokeImportCampaignPackage(campaignsRoot, exported)
    expect(imported).toEqual({ campaignId: CAMPAIGN_ID, name: CAMPAIGN_ID })

    const deps = createDefaultCampaignImportDeps()
    const restored = exportCampaignPackage(deps, { dataRoot, campaignId: CAMPAIGN_ID })
    expect(restored.slices.npc.npcIds).toEqual(exported.slices.npc.npcIds)
    expect(restored.slices.quest.worldQuests).toEqual(exported.slices.quest.worldQuests)
    getActiveCampaignSession()?.close()
  })
})

function seedContractCampaign(dataRoot: string, campaignId: string): void {
  seedContractWorld(dataRoot, campaignId)
  seedContractNpc(campaignId)
  seedContractFoeAndCompanions(campaignId)
  seedContractQuests(campaignId)
}

function seedContractQuests(campaignId: string): void {
  seedWorldQuests({
    campaignId,
    worldId: campaignId,
    seed: 'electron-portability-quest',
    pools: {
      regionIds: ['region-core'],
      placeIds: ['civ-core'],
      npcIds: ['npc-guide'],
      itemIds: ['item-token']
    },
    counts: { main: 1, side: 0 }
  })
}

function seedContractWorld(dataRoot: string, campaignId: string): void {
  const worldId = campaignId
  createWorldService(dataRoot).createWorld({
    worldId,
    seed: 11,
    bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 }
  })
  seedContractRegion(dataRoot, worldId)
  seedContractCivilization(dataRoot, worldId)
}

function seedContractRegion(dataRoot: string, worldId: string): void {
  createRegionStore(dataRoot).saveRegion(
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
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP
    },
    [
      { x: 0, y: 0 },
      { x: 1, y: 0 }
    ]
  )
}

function seedContractCivilization(dataRoot: string, worldId: string): void {
  createCivilizationStore(dataRoot).saveCivilization(
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
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP
    },
    [{ x: 0, y: 0 }]
  )
}

function seedContractNpc(campaignId: string): void {
  const worldId = campaignId
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
      race: {
        campaignId,
        characterId: 'npc-guide',
        raceId: 'human',
        name: 'Human',
        lore: 'Common folk of the roads.'
      },
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
}

function seedContractFoeAndCompanions(campaignId: string): void {
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
  if (!exportCharacterCampaignSlice({ campaignId }).characterIds.includes('companion-guide')) {
    throw new Error('expected companion seed to register character id')
  }
}

function clearCampaignState(dataRoot: string, campaignId: string): void {
  const worldId = campaignId
  createWorldService(dataRoot).deleteWorld(worldId)
  createRegionStore(dataRoot).clearRegions(worldId)
  createCivilizationStore(dataRoot).clearCivilizations(worldId)
  clearNpcStore()
  clearEnemyStore()
  clearQuestStores()
  setCampaignDay(campaignId, 0)
  itemEngine.restoreCampaignBalances({})
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'electron-portability-'))
  roots.push(root)
  return root
}
