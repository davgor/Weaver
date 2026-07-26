import {
  exportCharacterCampaignSlice,
  restoreCompanionsForCampaign,
  setCampaignDay
} from '@weaver/character-engine'
import { createCivilizationStore } from '@weaver/civilization-engine'
import { saveGeneratedFoe } from '@weaver/enemy-engine'
import { itemEngine } from '@weaver/item-engine'
import { saveNpc } from '@weaver/npc-engine'
import { createRegionStore } from '@weaver/regional-engine'
import { createWorldService } from '@weaver/world-engine'

const TIMESTAMP = '2026-01-01T00:00:00.000Z'

export function seedCampaign(dataRoot: string, campaignId: string): void {
  const worldId = campaignId
  seedWorld(dataRoot, worldId)
  seedRegion(dataRoot, worldId)
  seedCivilization(dataRoot, worldId)
  seedNpc(campaignId, worldId)
  seedFoe()
  seedCharacterAndCurrency(campaignId)
}

function seedWorld(dataRoot: string, worldId: string): void {
  createWorldService(dataRoot).createWorld({
    worldId,
    seed: 11,
    bounds: { minX: 0, minY: 0, maxX: 3, maxY: 3 }
  })
}

function seedRegion(dataRoot: string, worldId: string): void {
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

function seedCivilization(dataRoot: string, worldId: string): void {
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

function seedNpc(campaignId: string, worldId: string): void {
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

function seedFoe(): void {
  saveGeneratedFoe({
    foeId: 'foe-scout',
    bestiaryId: 'goblin-skirmisher',
    difficulty: 'easy',
    tags: ['scout'],
    regionId: 'region-core'
  })
}

function seedCharacterAndCurrency(campaignId: string): void {
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
