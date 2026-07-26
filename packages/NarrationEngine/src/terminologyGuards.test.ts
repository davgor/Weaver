import { describe, expect, it } from 'vitest'
import { applyTerminologyGuards, findForbiddenTerminology } from './terminologyGuards.js'

describe('applyTerminologyGuards', () => {
  it('rewrites trademarked tabletop terms in user-facing prose', () => {
    const result = applyTerminologyGuards('The beholder glares as your hit points drop.')

    expect(result.text).toBe('The eye tyrant glares as your vitality drop.')
    expect(result.rewrites).toEqual(
      expect.arrayContaining([
        { from: 'beholder', to: 'eye tyrant' },
        { from: 'hit points', to: 'vitality' }
      ])
    )
  })

  it('leaves internal code naming like DM untouched', () => {
    const result = applyTerminologyGuards('DM endpoint routed the scene update.')

    expect(result.text).toBe('DM endpoint routed the scene update.')
    expect(result.rewrites).toEqual([])
  })

  it('rewrites D&D branding to plain fantasy wording', () => {
    const result = applyTerminologyGuards('Welcome to our D&D campaign inspired by Dungeons & Dragons.')

    expect(result.text).toBe(
      'Welcome to our Tabletop fantasy campaign inspired by Tabletop fantasy.'
    )
    expect(result.rewrites.length).toBe(2)
  })
})

describe('findForbiddenTerminology', () => {
  it('flags trademark terms that remain after scrubbing', () => {
    expect(findForbiddenTerminology('A mind flayer waits in the dark.')).toEqual(['mind flayer'])
    expect(findForbiddenTerminology('The courtyard is quiet.')).toEqual([])
  })
})
