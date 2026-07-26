import { beforeEach, describe, expect, it } from 'vitest'
import { clearEmergentDirectionStore, recordTaggedPlayPattern } from './emergentDirection.js'
import { clearProgressionStore, setCharacterProgression } from './xp.js'
import { listKnownActions } from './records.js'
import { clearStartingLoadoutStore, selectStartingLoadout } from './startingLoadout.js'
import {
  applyLevelUpChoice,
  beginLevelUpCeremony,
  completeLevelUpWithFallback,
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

describe('levelUp ceremony completion', () => {
  beforeEach(() => {
    clearProgressionStore()
    clearEmergentDirectionStore()
    clearStartingLoadoutStore()
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
