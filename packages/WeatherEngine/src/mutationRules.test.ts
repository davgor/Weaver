import { describe, expect, it } from 'vitest'
import { landTypeMutation } from './mutationRules.js'

describe('landTypeMutation', () => {
  it('does not override for mild severity', () => {
    expect(landTypeMutation('storm', 2, 'grassland')).toBeNull()
  })

  it('floods grassland/forest under heavy rain or storm', () => {
    expect(landTypeMutation('rain', 3, 'grassland')).toBe('swamp')
    expect(landTypeMutation('storm', 5, 'forest')).toBe('swamp')
  })

  it('chills grassland to tundra under heavy snow', () => {
    expect(landTypeMutation('snow', 4, 'grassland')).toBe('tundra')
  })

  it('dries swamp under drought and thaws tundra under heatwave', () => {
    expect(landTypeMutation('drought', 3, 'swamp')).toBe('grassland')
    expect(landTypeMutation('heatwave', 3, 'tundra')).toBe('grassland')
  })
})
