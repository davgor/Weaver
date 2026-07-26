import { describe, expect, it } from 'vitest'
import { heuristicRoute } from './heuristicRoute.js'

describe('heuristicRoute', () => {
  it('returns commerce route for buy and sell without calling the LLM', () => {
    expect(heuristicRoute('I buy the iron sword')).toEqual({
      route: 'commerce',
      skipLlm: true,
      intent: { kind: 'buy', text: 'I buy the iron sword' }
    })
    expect(heuristicRoute('sell the rusty dagger')).toEqual({
      route: 'commerce',
      skipLlm: true,
      intent: { kind: 'sell', text: 'sell the rusty dagger' }
    })
  })

  it('returns travel route for journey intents', () => {
    expect(heuristicRoute('travel to Riverford')).toEqual({
      route: 'travel',
      skipLlm: true,
      intent: { kind: 'travel', text: 'travel to Riverford' }
    })
  })

  it('returns null for narration-only text so merged routing can run', () => {
    expect(heuristicRoute('I look around the tavern')).toBeNull()
    expect(heuristicRoute('ask the bartender about rumors')).toBeNull()
  })
})
