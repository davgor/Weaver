import { describe, expect, it } from 'vitest'
import { CharacterEngineError } from './errors.js'
import {
  computeFeatureFromTemplate,
  getFallbackTemplateId,
  isFeatureTemplateId,
  listArchetypeFeatureTemplates
} from './featureTemplates.js'

describe('featureTemplates catalog', () => {
  it('lists archetype perk templates without LLM-derived numbers', () => {
    const fighterTemplates = listArchetypeFeatureTemplates('Fighter')
    expect(fighterTemplates.length).toBeGreaterThan(0)
    for (const templateId of fighterTemplates) {
      expect(isFeatureTemplateId(templateId)).toBe(true)
    }
  })

  it('excludes emergent custom templates from archetype perk pools', () => {
    const mageTemplates = listArchetypeFeatureTemplates('Mage')
    expect(mageTemplates).not.toContain('emergent.custom_passive')
  })

  it('returns fallback template ids per archetype', () => {
    expect(getFallbackTemplateId('Fighter')).toBe('fighter.second_wind')
    expect(getFallbackTemplateId('Rogue')).toBe('rogue.cunning_action')
  })

  it('rejects unknown templates and invalid levels', () => {
    expect(isFeatureTemplateId('not.a.template')).toBe(false)
    expect(() => computeFeatureFromTemplate('unknown.template', { level: 1 })).toThrow(
      CharacterEngineError
    )
    expect(() => computeFeatureFromTemplate('fighter.second_wind', { level: 0 })).toThrow(
      /positive integer/i
    )
  })
})

describe('featureTemplates basic scaling', () => {
  it('computes mechanical effects only from template definitions', () => {
    const feature = computeFeatureFromTemplate('fighter.second_wind', { level: 3 })
    expect(feature).toMatchObject({
      featureId: expect.stringMatching(/^fighter\.second_wind-/),
      templateId: 'fighter.second_wind',
      kind: 'passive_feature',
      mechanicalEffects: { bonusHitPoints: 5 },
      grantedActionIds: []
    })
  })

  it('scales template numbers from opts rather than caller-supplied free text', () => {
    const low = computeFeatureFromTemplate('mage.arcane_focus', { level: 2 })
    const high = computeFeatureFromTemplate('mage.arcane_focus', { level: 6 })
    expect(low.mechanicalEffects.spellDcBonus).toBe(1)
    expect(high.mechanicalEffects.spellDcBonus).toBe(2)
  })

  it('can grant catalog action ids from templates', () => {
    const feature = computeFeatureFromTemplate('mage.frost_adept', { level: 4 })
    expect(feature.grantedActionIds).toEqual(['ice_bolt'])
  })
})

describe('featureTemplates level gates', () => {
  it('scales fighter, rogue, and mage level-gated effects', () => {
    expect(computeFeatureFromTemplate('fighter.action_surge', { level: 3 }).mechanicalEffects).toEqual({
      extraActionsPerRest: 1
    })
    expect(computeFeatureFromTemplate('fighter.action_surge', { level: 6 }).mechanicalEffects).toEqual({
      extraActionsPerRest: 2
    })
    expect(computeFeatureFromTemplate('rogue.sneak_attack', { level: 3 }).mechanicalEffects).toEqual({
      bonusDamageDice: 2
    })
    expect(computeFeatureFromTemplate('mage.frost_adept', { level: 4 }).mechanicalEffects).toEqual({
      spellDamageBonus: 1
    })
    expect(computeFeatureFromTemplate('mage.frost_adept', { level: 5 }).mechanicalEffects).toEqual({
      spellDamageBonus: 2
    })
  })

  it('scales cleric, ranger, and emergent level-gated effects', () => {
    expect(computeFeatureFromTemplate('cleric.channel_divinity', { level: 2 }).mechanicalEffects).toEqual({
      channelUses: 1
    })
    expect(computeFeatureFromTemplate('cleric.channel_divinity', { level: 6 }).mechanicalEffects).toEqual({
      channelUses: 2
    })
    expect(computeFeatureFromTemplate('ranger.hunters_mark', { level: 4 }).mechanicalEffects).toEqual({
      markedDamageBonus: 1
    })
    expect(computeFeatureFromTemplate('emergent.custom_passive', { level: 4 }).mechanicalEffects).toEqual({
      situationalBonus: 2
    })
  })
})
