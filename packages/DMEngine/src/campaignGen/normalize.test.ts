import { describe, expect, it } from 'vitest'
import {
  assertInput,
  catalogEntries,
  factsForStage,
  roleHints,
  stageSeed,
  stageText,
  toFactionInput,
  toFactionMembership,
  toNpcInput,
  toNumericSeed
} from './normalize.js'
import type { CampaignGenerationInput, GenerationState } from './types.js'

describe('campaign generation input normalization', () => {
  it('rejects blank required paths and out-of-range counts', () => {
    expect(() => assertInput({ ...baseInput(), campaignId: ' ' })).toThrow(
      'campaignId must be a non-empty string'
    )
    expect(() => assertInput({ ...baseInput(), dataRoot: '' })).toThrow(
      'dataRoot must be a non-empty string'
    )
    expect(() => assertInput({ ...baseInput(), campaignFilePath: '\n' })).toThrow(
      'campaignFilePath must be a non-empty string'
    )
    expect(() => assertInput({ ...baseInput(), regionCount: 6 })).toThrow(
      'regionCount must be an integer from 0 to 5'
    )
    expect(() => assertInput({ ...baseInput(), npcsPerRegion: 1.5 })).toThrow(
      'npcsPerRegion must be an integer from 0 to 10'
    )
  })

  it('reads required stage tokens after trimming text', () => {
    expect(stageText({ CANON: '  Moon roads stay true.  ' }, 'CANON')).toBe(
      'Moon roads stay true.'
    )
    expect(() => stageText({}, 'CANON')).toThrow('Validated stage is missing token CANON')
    expect(() => stageText({ CANON: '   ' }, 'CANON')).toThrow(
      'Validated stage is missing token CANON'
    )
  })

  it('derives deterministic numeric and stage seeds', () => {
    expect(toNumericSeed('')).toBe(0)
    expect(toNumericSeed('abc')).toBe(toNumericSeed('abc'))
    expect(stageSeed('base', 'world', 2)).toBe('base:world:3')
  })
})

describe('campaign generation object mapping', () => {
  it('maps faction and NPC fields from validated stage output', () => {
    expect(toFactionInput(baseState(), { FACTION_NAME: 'Lantern Cartographers' })).toEqual({
      factionId: 'campaign-test-faction-1',
      name: 'Lantern Cartographers'
    })

    const npc = toNpcInput({
      state: baseState(),
      slotId: 'slot-1',
      npcIndex: 0,
      filled: {
        NPC_STYLE: 'Name: Mira\nRace: elf\nAlignment: lawful good\nTemperament: patient'
      }
    })

    expect(npc).toMatchObject({
      campaignId: 'campaign-test',
      worldId: 'world-test',
      npcId: 'campaign-test-npc-1',
      raceId: 'elf',
      alignment: 'lawful good',
      temperament: 'patient',
      displayName: 'Mira'
    })
  })
})

describe('campaign generation NPC fallbacks', () => {
  it('uses NPC field fallbacks and wraps role hints for larger rosters', () => {
    const npc = toNpcInput({
      state: baseState(),
      slotId: 'slot-2',
      npcIndex: 1,
      filled: { NPC_STYLE: 'Role: scout' }
    })

    expect(npc).toMatchObject({
      npcId: 'campaign-test-npc-2',
      raceId: 'human',
      alignment: 'neutral',
      temperament: 'curious',
      displayName: 'Campaign NPC 2'
    })
    expect(roleHints(8)).toEqual([
      'resident',
      'farmer',
      'guard',
      'merchant',
      'lord',
      'mayor',
      'resident',
      'farmer'
    ])
  })
})

describe('campaign generation facts and catalog entries', () => {
  it('maps memberships, facts, and catalog fallbacks from state', () => {
    const state = {
      ...baseState(),
      canon: 'Canon text',
      pantheon: 'Pantheon text',
      worldSummary: 'World summary'
    }

    expect(toFactionMembership('faction-1', 'npc-1')).toEqual({
      factionId: 'faction-1',
      npcId: 'npc-1',
      role: 'campaign seed'
    })
    expect(factsForStage(state)).toEqual({
      campaignId: 'campaign-test',
      seed: 'seed-a',
      regionCount: '2',
      npcsPerRegion: '1',
      canon: 'Canon text',
      pantheon: 'Pantheon text',
      worldId: 'world-test',
      worldSummary: 'World summary'
    })
    expect(catalogEntries(baseState(), 'Persisted').map((entry) => JSON.parse(entry.payloadJson))).toEqual([
      expect.objectContaining({ campaignId: 'campaign-test', persistSummary: 'Persisted' }),
      { text: '' },
      { text: '' },
      { text: '' }
    ])
  })
})

function baseInput(): CampaignGenerationInput {
  return {
    campaignId: 'campaign-test',
    dataRoot: '/tmp/weaver-campaign-gen-test',
    campaignFilePath: '/tmp/weaver-campaign-gen-test/campaign.sqlite',
    regionCount: 2,
    npcsPerRegion: 1,
    seed: 'seed-a'
  }
}

function baseState(): GenerationState {
  return {
    input: baseInput(),
    seed: 'seed-a',
    worldId: 'world-test',
    stages: [],
    factions: [],
    regions: [],
    civilizations: [],
    placeholders: [],
    npcs: [],
    foes: [],
    catalogEntries: []
  }
}
