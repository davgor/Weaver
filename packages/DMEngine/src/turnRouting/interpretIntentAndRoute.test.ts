import { describe, expect, it } from 'vitest'
import type { TextCompleter } from '@weaver/narration-engine'
import { interpretIntentAndRoute } from './interpretIntentAndRoute.js'

describe('interpretIntentAndRoute combat lockout', () => {
  it('forces combat route when combat is active regardless of commerce text', async () => {
    const completer = neverCompleter()
    const plan = await interpretIntentAndRoute({
      text: 'buy the sword',
      completer,
      combatActive: true
    })

    expect(plan).toEqual({
      route: 'combat',
      skipLlm: true,
      intent: { kind: 'combat', text: 'buy the sword' }
    })
    expect(completer.calls).toBe(0)
  })
})

describe('interpretIntentAndRoute heuristic fast path', () => {
  it('skips the LLM for provably simple commerce and travel turns', async () => {
    const completer = neverCompleter()
    const buy = await interpretIntentAndRoute({
      text: 'purchase a healing potion',
      completer,
      combatActive: false
    })
    const travel = await interpretIntentAndRoute({
      text: 'head to the eastern gate',
      completer,
      combatActive: false
    })

    expect(buy.route).toBe('commerce')
    expect(buy.skipLlm).toBe(true)
    expect(travel.route).toBe('travel')
    expect(travel.skipLlm).toBe(true)
    expect(completer.calls).toBe(0)
  })
})

describe('interpretIntentAndRoute merged LLM call', () => {
  it('uses one completer call for ambiguous narration turns', async () => {
    const completer = scriptedCompleter(
      '{"intent":"examine the mural","route":"narration"}'
    )
    const plan = await interpretIntentAndRoute({
      text: 'examine the mural closely',
      completer,
      combatActive: false
    })

    expect(plan).toEqual({
      route: 'narration',
      skipLlm: false,
      intent: { kind: 'narration', text: 'examine the mural' }
    })
    expect(completer.calls).toBe(1)
  })
})

function neverCompleter(): TextCompleter & { calls: number } {
  let calls = 0
  return {
    get calls() {
      return calls
    },
    completeText: async () => {
      calls += 1
      return { text: '{"intent":"unexpected","route":"narration"}', backend: 'test' }
    }
  }
}

function scriptedCompleter(text: string): TextCompleter & { calls: number } {
  let calls = 0
  return {
    get calls() {
      return calls
    },
    completeText: async () => {
      calls += 1
      return { text, backend: 'scripted' }
    }
  }
}
