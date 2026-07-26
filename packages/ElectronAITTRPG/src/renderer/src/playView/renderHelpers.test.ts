import { describe, expect, it } from 'vitest'
import { nextD20OverlayState } from './d20OverlayState'
import { incomingGlowIds } from './glowState'
import { parseNarrativeEmphasis } from './narrativeEmphasis'

describe('parseNarrativeEmphasis', () => {
  it('parses bold and italic DM prose markers into renderable segments', () => {
    expect(parseNarrativeEmphasis('The **gate** is *silent*.')).toEqual([
      { text: 'The ', emphasis: 'normal' },
      { text: 'gate', emphasis: 'bold' },
      { text: ' is ', emphasis: 'normal' },
      { text: 'silent', emphasis: 'italic' },
      { text: '.', emphasis: 'normal' }
    ])
  })
})

describe('incomingGlowIds', () => {
  it('returns only newly received social line ids', () => {
    expect(incomingGlowIds(['a'], ['a', 'b', 'c'])).toEqual(['b', 'c'])
  })
})

describe('nextD20OverlayState', () => {
  it('animates from idle to rolling to settled and back to idle', () => {
    const rolling = nextD20OverlayState({ phase: 'idle' }, { type: 'show', label: 'narration check', roll: 17 })
    expect(rolling).toEqual({ phase: 'rolling', label: 'narration check', roll: 17 })
    expect(nextD20OverlayState(rolling, { type: 'settle' })).toEqual({
      phase: 'settled',
      label: 'narration check',
      roll: 17
    })
    expect(nextD20OverlayState({ phase: 'settled', label: 'x', roll: 10 }, { type: 'hide' })).toEqual({
      phase: 'idle'
    })
  })
})
