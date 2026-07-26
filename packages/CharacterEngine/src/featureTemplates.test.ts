import { describe, expect, it } from 'vitest'
import {
  computeFeatureFromTemplate,
  isFeatureTemplateId,
  listArchetypeFeatureTemplates
} from './featureTemplates.js'

describe('featureTemplates', () => {
  it('lists archetype perk templates without LLM-derived numbers', () => {
    const fighterTemplates = listArchetypeFeatureTemplates('Fighter')
    expect(fighterTemplates.length).toBeGreaterThan(0)
    for (const templateId of fighterTemplates) {
      expect(isFeatureTemplateId(templateId)).toBe(true)
    }
  })

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
