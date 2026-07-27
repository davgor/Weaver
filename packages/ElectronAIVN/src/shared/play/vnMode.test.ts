import { describe, expect, it } from 'vitest'
import { vnModeFromNarration, vnModeFromProjection } from './vnMode.js'

describe('vnModeFromNarration', () => {
  it('maps scene vs social projections to play modes', () => {
    expect(vnModeFromNarration({ kind: 'scene' })).toBe('scene')
    expect(vnModeFromNarration({ kind: 'social' })).toBe('npc')
  })

  it('falls back from optional speaker id only when narration kind is absent', () => {
    expect(vnModeFromProjection({ socialSpeakerId: 'npc-1' })).toBe('npc')
    expect(vnModeFromProjection({})).toBe('scene')
    expect(vnModeFromProjection({ narrationKind: 'scene', socialSpeakerId: 'npc-1' })).toBe('scene')
  })
})
