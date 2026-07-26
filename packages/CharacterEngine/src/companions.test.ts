import { beforeEach, describe, expect, it } from 'vitest'
import { getArchetype } from './archetypes.js'
import { clearCharacterStatsStore, getCharacterStats } from './hp.js'
import {
  clearCompanionStore,
  createCompanion,
  getCompanion,
  getCompanionOnboardingStatus,
  isCompanionCharacter,
  listCompanions,
  skipCompanionCreation
} from './companions.js'
import { listKnownActions } from './records.js'
import {
  clearStartingLoadoutStore,
  getCharacterArchetype,
  getCharacterStartingLoadout,
  selectStartingLoadout
} from './startingLoadout.js'

describe('companion onboarding gate', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
  })

  it('requires post-equipment loadout before companion creation', () => {
    expect(() =>
      createCompanion({
        ownerCharacterId: 'pc-1',
        campaignId: 'camp-1',
        name: 'Lyra',
        archetype: 'Ranger'
      })
    ).toThrow(/post-equipment/i)
  })

  it('marks companion step pending after owner equipment selection', () => {
    selectStartingLoadout('pc-1', 'Fighter')
    expect(getCompanionOnboardingStatus('pc-1')).toBe('pending')
  })

  it('returns undefined onboarding status before owner equipment', () => {
    expect(getCompanionOnboardingStatus('pc-new')).toBeUndefined()
  })

  it('allows skipping companion creation after equipment', () => {
    selectStartingLoadout('pc-1', 'Fighter')
    const status = skipCompanionCreation('pc-1')
    expect(status).toBe('skipped')
    expect(getCompanionOnboardingStatus('pc-1')).toBe('skipped')
    expect(listCompanions('pc-1')).toEqual([])
  })
})

describe('companion record creation', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
    selectStartingLoadout('pc-1', 'Fighter')
  })

  it('creates a full companion record owned by the player character', () => {
    const companion = createCompanion({
      ownerCharacterId: 'pc-1',
      campaignId: 'camp-1',
      name: 'Lyra',
      archetype: 'Ranger',
      bodyMod: 2
    })

    expect(companion).toMatchObject({
      ownerCharacterId: 'pc-1',
      campaignId: 'camp-1',
      name: 'Lyra',
      isCompanion: true,
      archetype: 'Ranger'
    })
    expect(companion.characterId).toMatch(/^companion-/)
    expect(isCompanionCharacter(companion.characterId)).toBe(true)
    expect(getCompanionOnboardingStatus('pc-1')).toBe('completed')
    expect(listCompanions('pc-1')).toEqual([companion])
  })

  it('initializes companion HP, loadout, and known actions like a full character', () => {
    const companion = createCompanion({
      ownerCharacterId: 'pc-1',
      campaignId: 'camp-1',
      name: 'Lyra',
      archetype: 'Ranger',
      bodyMod: 1
    })

    const archetype = getArchetype('Ranger')
    const stats = getCharacterStats(companion.characterId)
    const loadout = getCharacterStartingLoadout(companion.characterId)

    expect(stats?.maxHp).toBe(archetype.hitDie + 1)
    expect(getCharacterArchetype(companion.characterId)).toBe('Ranger')
    expect(loadout?.actionIds.length).toBeGreaterThan(0)
    expect(listKnownActions(companion.characterId)).toEqual([...loadout!.actionIds].sort())
  })
})

describe('companion lookup and validation', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
    clearCharacterStatsStore()
    selectStartingLoadout('pc-1', 'Fighter')
  })

  it('exposes companion lookup helpers and honors custom level', () => {
    const companion = createCompanion({
      ownerCharacterId: 'pc-1',
      campaignId: 'camp-1',
      name: 'Kael',
      archetype: 'Fighter',
      level: 3
    })

    expect(getCompanion(companion.characterId)).toEqual(companion)
    expect(getCompanion('missing')).toBeUndefined()
    expect(isCompanionCharacter('missing')).toBe(false)
    expect(getCharacterStartingLoadout(companion.characterId)?.level).toBe(3)
  })

  it('rejects invalid companion input', () => {
    expect(() =>
      createCompanion({
        ownerCharacterId: 'pc-1',
        campaignId: ' ',
        name: 'Lyra',
        archetype: 'Ranger'
      })
    ).toThrow(/campaignId/i)
    expect(() =>
      createCompanion({
        ownerCharacterId: 'pc-1',
        campaignId: 'camp-1',
        name: 'Lyra',
        archetype: 'NotAnArchetype' as 'Ranger'
      })
    ).toThrow(/unknown archetype/i)
    expect(() => listCompanions('  ')).toThrow(/ownerCharacterId/i)
  })
})
