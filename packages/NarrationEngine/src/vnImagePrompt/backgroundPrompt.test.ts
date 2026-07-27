import { describe, expect, it } from 'vitest'
import {
  buildVnBackgroundPrompt,
  listVnBackgroundPresets,
  type VnBackgroundPresetId
} from '../index.js'

describe('VN background prompt presets', () => {
  it('lists the V1 preset catalog', () => {
    const presets = listVnBackgroundPresets()

    expect(presets.map((preset) => preset.id)).toEqual(
      expect.arrayContaining([
        'tavern_interior',
        'forest_path',
        'city_street',
        'castle_hall',
        'night_camp'
      ])
    )
  })

  it('builds a preset background prompt by id', () => {
    const prompt = buildVnBackgroundPrompt({
      kind: 'preset',
      presetId: 'tavern_interior'
    })

    expect(prompt.label).toBe('Tavern interior background')
    expect(prompt.fullPrompt).toMatch(/anime visual novel background/i)
    expect(prompt.fullPrompt).toContain('warm wooden tavern interior')
    expect(prompt.fullPrompt).toMatch(/no characters/i)
  })

  it('rejects unknown preset ids', () => {
    expect(() =>
      buildVnBackgroundPrompt({
        kind: 'preset',
        presetId: 'desert_palace' as VnBackgroundPresetId
      })
    ).toThrow(/background preset/i)
  })
})

describe('VN adaptive background prompts', () => {
  it('uses only caller-provided location and scene descriptors', () => {
    const prompt = buildVnBackgroundPrompt({
      kind: 'adaptive',
      locationLabel: 'Moon Gate Road',
      sceneDescriptors: ['rain-slick stones', 'closed market stalls']
    })

    expect(prompt.label).toBe('Moon Gate Road background')
    expect(prompt.fullPrompt).toContain('Location: Moon Gate Road')
    expect(prompt.fullPrompt).toContain('Scene descriptors: rain-slick stones; closed market stalls')
    expect(prompt.fullPrompt).not.toMatch(/forest|mountain|castle|tavern/i)
  })

  it('rejects adaptive prompts missing required caller facts', () => {
    expect(() =>
      buildVnBackgroundPrompt({
        kind: 'adaptive',
        locationLabel: '',
        sceneDescriptors: ['lantern-lit bridge']
      })
    ).toThrow(/locationLabel/i)
    expect(() =>
      buildVnBackgroundPrompt({
        kind: 'adaptive',
        locationLabel: 'Old Bridge',
        sceneDescriptors: ['  ']
      })
    ).toThrow(/sceneDescriptors/i)
  })
})
