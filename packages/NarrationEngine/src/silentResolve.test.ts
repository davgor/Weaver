import { describe, expect, it } from 'vitest'
import { decideSilentResolve } from './silentResolve.js'

describe('decideSilentResolve', () => {
  it('resolves silently for low-stakes turns with nothing narratively interesting', () => {
    expect(
      decideSilentResolve({
        stakes: 'low',
        hasDialogue: false,
        worldChanged: false,
        combatOccurred: false,
        noteworthyEventCount: 0
      })
    ).toEqual({ silent: true, reason: 'nothing_interesting' })
  })

  it('requires narration when dialogue, world change, combat, or stakes appear', () => {
    expect(
      decideSilentResolve({
        stakes: 'low',
        hasDialogue: true,
        worldChanged: false,
        combatOccurred: false,
        noteworthyEventCount: 0
      }).silent
    ).toBe(false)

    expect(
      decideSilentResolve({
        stakes: 'high',
        hasDialogue: false,
        worldChanged: false,
        combatOccurred: false,
        noteworthyEventCount: 0
      }).reason
    ).toBe('needs_narration')
  })
})
