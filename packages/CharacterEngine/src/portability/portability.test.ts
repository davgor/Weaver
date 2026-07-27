import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearAutosaveStore,
  getLatestAutosaveSnapshot,
  recordAutosaveSnapshot,
  type CharacterAutosaveSnapshot
} from '../autosave.js'
import { getCharacterFactStore } from '../campaignFactStore.js'
import { clearCompanionStore, restoreCompanionsForCampaign } from '../companions.js'
import { clearDeathModeStores, setCampaignDeathMode } from '../deathModes.js'
import {
  clearCharacterStatsStore,
  getCharacterStats,
  restoreCharacterStats,
  type CharacterStats
} from '../hp.js'
import {
  clearCharacterLocationStore,
  getCharacterLocation,
  setCharacterLocation
} from '../location.js'
import {
  addJournalEntry,
  learnKnownAction,
  listJournalEntries,
  listKnownActions,
  listLogBookEntries,
  listQuestLog,
  upsertQuest,
  writeLogBookEvent
} from '../records.js'
import { setCampaignDay } from '../timeRest.js'
import { exportCampaignSlice, importCampaignSlice } from './index.js'
import {
  CHARACTER_SLICE_VERSION,
  CharacterPortabilitySchemaError,
  type CharacterCampaignSlice
} from './types.js'

const CAMPAIGN_ID = 'campaign-character'

beforeEach(() => {
  clearCompanionStore()
  clearCharacterLocationStore()
  clearDeathModeStores()
  clearCharacterStatsStore()
  clearRecordStores()
  clearAutosaveStore()
  setCampaignDay(CAMPAIGN_ID, 0)
})

describe('CharacterEngine campaign portability companions', () => {
  it('round-trips campaign day, companions, and empty locations', () => {
    setCampaignDay(CAMPAIGN_ID, 4)
    restoreCompanionsForCampaign([
      {
        characterId: 'companion-1',
        ownerCharacterId: 'pc-owner',
        campaignId: CAMPAIGN_ID,
        name: 'Mira',
        isCompanion: true,
        archetype: 'Fighter'
      }
    ])

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.day).toBe(4)
    expect(slice.sliceVersion).toBe(CHARACTER_SLICE_VERSION)
    expect(slice.characterIds).toEqual(['companion-1'])
    expect(slice.locations).toEqual([])

    clearCompanionStore()
    clearCharacterLocationStore()
    setCampaignDay(CAMPAIGN_ID, 0)
    importCampaignSlice(ctx, slice)
    const restored = exportCampaignSlice(ctx)
    expect(restored.day).toBe(4)
    expect(restored.characterIds).toEqual(['companion-1'])
    expect(restored.locations).toEqual([])
  })
})

describe('CharacterEngine campaign portability durable facts', () => {
  it('round-trips stats, records, known actions, autosaves, and all fact character ids', () => {
    const expected = seedDurableFacts()
    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)

    expect(slice.sliceVersion).toBe(3)
    expect(slice.deathMode).toBe('standard')
    expect(slice.characterIds).toEqual(expected.characterIds)
    expect(slice.stats[expected.heroStats.characterId]).toEqual(expected.heroStats)
    expect(slice.journal['pc-journal-only']).toEqual([expected.journalOnly])
    expect(slice.logbook['pc-log-only']).toEqual([expected.logOnly])
    expect(slice.questLog['pc-quest-only']).toEqual([expected.questOnly])
    expect(slice.knownActionIds['pc-action-only']).toEqual(['spell.spark'])
    expect(slice.autosaves['pc-autosave-only']).toEqual(expected.autosaveOnly)

    clearAllCharacterFacts()
    seedStaleFacts()
    importCampaignSlice(ctx, slice)

    expect(getCharacterStats(expected.heroStats.characterId)).toEqual(expected.heroStats)
    expect(getCharacterStats('pc-stale')).toBeUndefined()
    expect(listJournalEntries('pc-journal-only')).toEqual([expected.journalOnly])
    expect(listJournalEntries('pc-stale')).toEqual([])
    expect(listLogBookEntries('pc-log-only')).toEqual([expected.logOnly])
    expect(listQuestLog('pc-quest-only')).toEqual([expected.questOnly])
    expect(listKnownActions('pc-action-only')).toEqual(['spell.spark'])
    expect(getLatestAutosaveSnapshot('pc-autosave-only')).toEqual(expected.autosaveOnly)
    expect(getLatestAutosaveSnapshot('pc-stale')).toBeUndefined()
  })
})

describe('CharacterEngine campaign portability locations', () => {
  it('round-trips non-empty character locations', () => {
    setCampaignDay(CAMPAIGN_ID, 9)
    setCharacterLocation({
      characterId: 'pc-placed',
      campaignId: CAMPAIGN_ID,
      regionId: 'region-coast',
      placeId: 'harbor',
      locationKind: 'settlement'
    })

    const ctx = { campaignId: CAMPAIGN_ID }
    const slice = exportCampaignSlice(ctx)
    expect(slice.locations).toEqual([
      {
        characterId: 'pc-placed',
        campaignId: CAMPAIGN_ID,
        regionId: 'region-coast',
        placeId: 'harbor',
        locationKind: 'settlement',
        updatedDay: 9
      }
    ])

    clearCharacterLocationStore()
    expect(getCharacterLocation('pc-placed')).toBeNull()
    importCampaignSlice(ctx, slice)
    expect(getCharacterLocation('pc-placed')).toEqual(slice.locations[0])
  })

  it('rejects location records for a different campaign', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice: CharacterCampaignSlice = {
      ...slice,
      locations: [
        {
          characterId: 'pc-wrong-camp',
          campaignId: 'other-campaign',
          regionId: 'r1',
          locationKind: 'overworld'
        }
      ]
    }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(CharacterPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/belongs to campaign/)
  })
})

describe('CharacterEngine campaign portability schema validation', () => {
  it('rejects unsupported slice versions', () => {
    const { ctx, slice } = seedAndExport()
    const v2Slice = { ...slice, sliceVersion: 2 as typeof CHARACTER_SLICE_VERSION }
    const futureSlice = { ...slice, sliceVersion: 99 as typeof CHARACTER_SLICE_VERSION }
    expect(() => importCampaignSlice(ctx, v2Slice)).toThrow(CharacterPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, v2Slice)).toThrow(/Unsupported character slice version/)
    expect(() => importCampaignSlice(ctx, futureSlice)).toThrow(CharacterPortabilitySchemaError)
  })

  it('rejects campaignId mismatch', () => {
    const { ctx, slice } = seedAndExport()
    const badSlice = { ...slice, campaignId: 'other-campaign' }
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(CharacterPortabilitySchemaError)
    expect(() => importCampaignSlice(ctx, badSlice)).toThrow(/campaignId mismatch/)
  })
})

function seedAndExport(): { ctx: { campaignId: string }; slice: CharacterCampaignSlice } {
  setCampaignDay(CAMPAIGN_ID, 3)
  restoreCompanionsForCampaign([
    {
      characterId: 'companion-schema',
      ownerCharacterId: 'pc-owner',
      campaignId: CAMPAIGN_ID,
      name: 'Schema',
      isCompanion: true,
      archetype: 'Fighter'
    }
  ])
  const ctx = { campaignId: CAMPAIGN_ID }
  return { ctx, slice: exportCampaignSlice(ctx) }
}

function seedDurableFacts(): {
  characterIds: string[]
  heroStats: CharacterStats
  journalOnly: ReturnType<typeof addJournalEntry>
  logOnly: ReturnType<typeof writeLogBookEvent>[number]
  questOnly: ReturnType<typeof upsertQuest>
  autosaveOnly: CharacterAutosaveSnapshot
} {
  seedCampaignMetaAndPlacements()
  const records = seedCharacterRecordFacts()
  const autosaveOnly = buildAutosave('pc-autosave-only')
  recordAutosaveSnapshot('pc-autosave-only', autosaveOnly)
  return {
    characterIds: [
      'pc-action-only',
      'pc-autosave-only',
      'pc-companion',
      'pc-journal-only',
      'pc-location-only',
      'pc-log-only',
      'pc-quest-only',
      'pc-stats-only'
    ],
    ...records,
    autosaveOnly
  }
}

function seedCampaignMetaAndPlacements(): void {
  setCampaignDay(CAMPAIGN_ID, 6)
  setCampaignDeathMode(CAMPAIGN_ID, 'standard')
  restoreCompanionsForCampaign([buildCompanion('pc-companion')])
  setCharacterLocation(buildLocation('pc-location-only'))
}

function seedCharacterRecordFacts(): {
  heroStats: CharacterStats
  journalOnly: ReturnType<typeof addJournalEntry>
  logOnly: ReturnType<typeof writeLogBookEvent>[number]
  questOnly: ReturnType<typeof upsertQuest>
} {
  const heroStats = restoreCharacterStats(buildStats('pc-stats-only', 11))
  const journalOnly = addJournalEntry({
    characterId: 'pc-journal-only',
    text: 'Met the cartographer.',
    createdAt: '2026-01-01T00:00:00.000Z',
    linkedNpcId: 'npc-map'
  })
  const logOnly = writeLogBookEvent({
    characterIds: ['pc-log-only'],
    type: 'scene',
    payload: { sceneId: 'intro' },
    createdAt: '2026-01-01T00:05:00.000Z'
  })[0]
  const questOnly = upsertQuest({
    characterId: 'pc-quest-only',
    questId: 'quest-1',
    kind: 'main',
    status: 'active',
    title: 'Find the gate'
  })
  learnKnownAction('pc-action-only', 'spell.spark')
  return { heroStats, journalOnly, logOnly, questOnly }
}

function seedStaleFacts(): void {
  restoreCharacterStats(buildStats('pc-stale', 4))
  addJournalEntry({
    characterId: 'pc-stale',
    text: 'Stale',
    createdAt: '2026-01-02T00:00:00.000Z'
  })
  learnKnownAction('pc-stale', 'spell.old')
  recordAutosaveSnapshot('pc-stale', buildAutosave('pc-stale'))
}

function clearAllCharacterFacts(): void {
  clearCompanionStore()
  clearCharacterLocationStore()
  clearDeathModeStores()
  clearCharacterStatsStore()
  clearRecordStores()
  clearAutosaveStore()
  setCampaignDay(CAMPAIGN_ID, 0)
}

function clearRecordStores(): void {
  const store = getCharacterFactStore()
  store.clearJournal()
  store.clearLogBook()
  store.clearQuests()
  store.clearKnownActions()
}

function buildCompanion(characterId: string) {
  return {
    characterId,
    ownerCharacterId: 'pc-owner',
    campaignId: CAMPAIGN_ID,
    name: 'Scout',
    isCompanion: true as const,
    archetype: 'Ranger' as const
  }
}

function buildLocation(characterId: string) {
  return {
    characterId,
    campaignId: CAMPAIGN_ID,
    regionId: 'region-core',
    placeId: 'camp',
    locationKind: 'settlement' as const,
    updatedDay: 6
  }
}

function buildStats(characterId: string, currentHp: number): CharacterStats {
  return {
    characterId,
    maxHp: 12,
    currentHp,
    conditions: ['Poisoned'],
    dying: null
  }
}

function buildAutosave(characterId: string): CharacterAutosaveSnapshot {
  return {
    stats: buildStats(characterId, 8),
    recordedAt: '2026-01-01T00:10:00.000Z'
  }
}
