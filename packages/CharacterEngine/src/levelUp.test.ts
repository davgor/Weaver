import { beforeEach, describe, expect, it } from 'vitest'
import { clearEmergentDirectionStore, recordTaggedPlayPattern } from './emergentDirection.js'
import { clearProgressionStore, setCharacterProgression } from './xp.js'
import { listKnownActions } from './records.js'
import { clearStartingLoadoutStore, selectStartingLoadout } from './startingLoadout.js'
import {
  applyLevelUpChoice,
  beginLevelUpCeremony,
  clearLevelUpStore,
  completeLevelUpWithFallback,
  listGrantedFeatures,
  type PerkFlavorProposer
} from './levelUp.js'

function seedReadyCharacter(characterId: string, level = 1): void {
  selectStartingLoadout(characterId, 'Mage', level)
  setCharacterProgression(characterId, level, 0)
}

describe('levelUp ceremony choices', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
    clearLevelUpStore()
  })

  it('produces template-backed perk choices for the next level', async () => {
    seedReadyCharacter('pc-level')
    const ceremony = await beginLevelUpCeremony({
      characterId: 'pc-level',
      archetype: 'Mage',
      currentLevel: 1
    })
    expect(ceremony.nextLevel).toBe(2)
    expect(ceremony.choices.length).toBeGreaterThanOrEqual(2)
    for (const choice of ceremony.choices) {
      expect(choice.mechanicalEffects).toBeDefined()
      expect(choice.templateId).toMatch(/^mage\./)
    }
  })

  it('includes at most one emergent custom feature choice when direction is detected', async () => {
    seedReadyCharacter('pc-emergent-choice', 2)
    for (let count = 0; count < 5; count += 1) {
      recordTaggedPlayPattern('pc-emergent-choice', 'stealth')
    }
    const ceremony = await beginLevelUpCeremony({
      characterId: 'pc-emergent-choice',
      archetype: 'Mage',
      currentLevel: 2
    })
    const emergentChoices = ceremony.choices.filter((choice) => choice.kind === 'custom_feature')
    expect(emergentChoices).toHaveLength(1)
    expect(emergentChoices[0]?.templateId).toBe('emergent.custom_passive')
  })
})

describe('levelUp apply and flavor', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
    clearLevelUpStore()
  })

  it('records known ActionEngine action ids when a template grants actions', async () => {
    seedReadyCharacter('pc-actions', 3)
    const ceremony = await beginLevelUpCeremony({
      characterId: 'pc-actions',
      archetype: 'Mage',
      currentLevel: 3
    })
    const actionChoice = ceremony.choices.find((choice) => choice.grantedActionIds.length > 0)
    expect(actionChoice).toBeDefined()

    const result = applyLevelUpChoice({
      characterId: 'pc-actions',
      archetype: 'Mage',
      currentLevel: 3,
      templateId: actionChoice!.templateId,
      flavorText: 'Frost threads your focus.'
    })
    expect(result.level).toBe(4)
    expect(listKnownActions('pc-actions')).toContain('ice_bolt')
  })

  it('applies flavor proposals during ceremony and records granted features', async () => {
    seedReadyCharacter('pc-flavor')
    const proposer: PerkFlavorProposer = async (choices) =>
      choices.map((choice) => ({
        templateId: choice.templateId,
        flavorText: `Flavor for ${choice.templateId}`
      }))

    const ceremony = await beginLevelUpCeremony({
      characterId: 'pc-flavor',
      archetype: 'Mage',
      currentLevel: 1,
      proposer
    })

    expect(ceremony.choices.every((choice) => choice.flavorText?.startsWith('Flavor for'))).toBe(true)

    const result = applyLevelUpChoice({
      characterId: 'pc-flavor',
      archetype: 'Mage',
      currentLevel: 1,
      templateId: ceremony.choices[0]!.templateId
    })
    expect(listGrantedFeatures('pc-flavor')).toHaveLength(1)
    expect(result.feature.templateId).toBe(ceremony.choices[0]!.templateId)
  })
})

describe('levelUp validation and emergent grants', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
    clearLevelUpStore()
  })

  it('rejects level-up when progression level does not match', () => {
    seedReadyCharacter('pc-mismatch')
    setCharacterProgression('pc-mismatch', 2, 0)

    expect(() =>
      applyLevelUpChoice({
        characterId: 'pc-mismatch',
        archetype: 'Mage',
        currentLevel: 1,
        templateId: 'mage.arcane_focus'
      })
    ).toThrow(/does not match/i)
  })

  it('marks emergent direction granted when the custom passive template is chosen', async () => {
    seedReadyCharacter('pc-emergent-grant', 2)
    for (let count = 0; count < 5; count += 1) {
      recordTaggedPlayPattern('pc-emergent-grant', 'stealth')
    }

    await applyLevelUpChoice({
      characterId: 'pc-emergent-grant',
      archetype: 'Mage',
      currentLevel: 2,
      templateId: 'emergent.custom_passive'
    })

    const ceremony = await beginLevelUpCeremony({
      characterId: 'pc-emergent-grant',
      archetype: 'Mage',
      currentLevel: 3
    })
    expect(ceremony.choices.every((choice) => choice.templateId !== 'emergent.custom_passive')).toBe(true)
  })
})

describe('levelUp proposer fallback', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
    clearLevelUpStore()
  })

  it('completes level-up with a fallback perk when the proposer fails', async () => {
    seedReadyCharacter('pc-fallback')
    const failingProposer: PerkFlavorProposer = async () => {
      throw new Error('agent unavailable')
    }
    const result = await completeLevelUpWithFallback({
      characterId: 'pc-fallback',
      archetype: 'Mage',
      currentLevel: 1,
      proposer: failingProposer
    })
    expect(result.usedFallback).toBe(true)
    expect(result.level).toBe(2)
    expect(result.feature.kind).toBe('passive_feature')
    expect(result.feature.mechanicalEffects).toBeDefined()
  })
})

describe('levelUp proposer selection', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
    clearLevelUpStore()
  })

  it('completes without fallback when proposer selects a valid template', async () => {
    seedReadyCharacter('pc-proposer')
    const ceremony = await beginLevelUpCeremony({
      characterId: 'pc-proposer',
      archetype: 'Mage',
      currentLevel: 1
    })
    const chosen = ceremony.choices[0]!
    const proposer: PerkFlavorProposer = async () => [
      { templateId: chosen.templateId, flavorText: 'Chosen by agent.' }
    ]

    const result = await completeLevelUpWithFallback({
      characterId: 'pc-proposer',
      archetype: 'Mage',
      currentLevel: 1,
      proposer
    })

    expect(result.usedFallback).toBe(false)
    expect(result.feature.templateId).toBe(chosen.templateId)
  })

  it('completes with archetype fallback when no proposer is supplied', async () => {
    seedReadyCharacter('pc-no-proposer')
    const result = await completeLevelUpWithFallback({
      characterId: 'pc-no-proposer',
      archetype: 'Mage',
      currentLevel: 1
    })

    expect(result.usedFallback).toBe(false)
    expect(result.feature.templateId).toBe('mage.arcane_focus')
  })
})

describe('levelUp proposer mismatch', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
    clearLevelUpStore()
  })

  it('falls back when the proposer returns no matching template id', async () => {
    seedReadyCharacter('pc-no-match')
    const proposer: PerkFlavorProposer = async () => [
      { templateId: 'not.in.choices', flavorText: 'ignored' }
    ]

    const result = await completeLevelUpWithFallback({
      characterId: 'pc-no-match',
      archetype: 'Mage',
      currentLevel: 1,
      proposer
    })

    expect(result.usedFallback).toBe(false)
    expect(result.feature.templateId).toBe('mage.arcane_focus')
  })
})
