import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcStore, constructNpc, getNpc, getNpcLocation } from './index.js'

function resetConstructionState() {
  clearNpcStore()
  clearNpcPlaceholderStore()
  setCampaignRaceRoster('campaign-identity', [{ raceId: 'elf', name: 'Elf' }])
}

function placeholderInput() {
  return {
    worldId: 'world-identity',
    civilizationId: 'civ-identity',
    regionId: 'region-identity',
    roleHints: ['guard'] as const
  }
}

function baseConstructFields(slotId: string) {
  return {
    campaignId: 'campaign-identity',
    worldId: 'world-identity',
    placeholderSlotId: slotId,
    raceId: 'elf'
  }
}

describe('NPC construction and identity', () => {
  beforeEach(resetConstructionState)

  it('claims a CivilizationEngine placeholder and builds a queryable identity bundle', () => {
    const [slot] = ensureNpcPlaceholders(placeholderInput())
    expectIdentityBundle(slot.slotId)
  })

  it('keeps caller-provided names and dialogue flavor optional', () => {
    const [slot] = ensureNpcPlaceholders(placeholderInput())
    expectOptionalFlavorOmitted(slot.slotId)
  })

  it('models animals and constructs as non-speaking without speaking-style fields', () => {
    const [slot] = ensureNpcPlaceholders(placeholderInput())
    expectConstructIsNonSpeaking(slot.slotId)
  })

  it('seeds current location from the claimed placeholder without changing spawn fields', () => {
    const [slot] = ensureNpcPlaceholders(placeholderInput())
    const npc = constructNpc({
      ...baseConstructFields(slot.slotId),
      npcId: 'npc-seed-location',
      alignment: 'neutral',
      temperament: 'calm',
      abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
    })

    expect(npc.regionId).toBe('region-identity')
    expect(npc.civilizationId).toBe('civ-identity')
    expect(getNpcLocation('npc-seed-location')).toEqual({
      npcId: 'npc-seed-location',
      campaignId: 'campaign-identity',
      regionId: 'region-identity',
      placeId: 'civ-identity',
      locationKind: 'settlement',
      updatedDay: 0
    })
  })
})

function expectIdentityBundle(slotId: string) {
  const npc = constructNpc({
    ...baseConstructFields(slotId),
    npcId: 'npc-identity',
    background: { backgroundId: 'warden', name: 'Road Warden' },
    alignment: 'lawful',
    temperament: 'patient',
    abilityScores: { Body: 12, Agility: 14, Mind: 10, Presence: 8 },
    speakingStyle: { tone: 'measured', vocabulary: ['careful', 'formal'] }
  })

  expect(npc.placeholder.status).toBe('assigned')
  expect(npc.placeholder.assignedNpcId).toBe('npc-identity')
  expect(npc.identity).toMatchObject({
    race: { raceId: 'elf', name: 'Elf' },
    background: { backgroundId: 'warden', name: 'Road Warden' },
    alignment: 'lawful',
    temperament: 'patient',
    nonSpeaking: false
  })
  expect(npc.abilityModifiers).toMatchObject({ Body: 1, Agility: 2, Mind: 0, Presence: -1 })
  expect(getNpc('npc-identity')?.identity.race.name).toBe('Elf')
}

function expectOptionalFlavorOmitted(slotId: string) {
  const npc = constructNpc({
    ...baseConstructFields(slotId),
    npcId: 'npc-no-flavor',
    alignment: 'neutral',
    temperament: 'reserved',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
  })

  expect(npc.displayName).toBeUndefined()
  expect(npc.dialogueFlavor).toBeUndefined()
}

function expectConstructIsNonSpeaking(slotId: string) {
  const npc = constructNpc({
    ...baseConstructFields(slotId),
    npcId: 'npc-construct',
    alignment: 'unaligned',
    temperament: 'watchful',
    speciesKind: 'construct',
    abilityScores: { Body: 14, Agility: 8, Mind: 6, Presence: 6 },
    dialogueFlavor: 'unused dialogue',
    speakingStyle: { tone: 'unused', vocabulary: ['unused'] }
  })

  expect(npc.identity.nonSpeaking).toBe(true)
  expect('speakingStyle' in npc).toBe(false)
  expect('dialogueFlavor' in npc).toBe(false)
}
