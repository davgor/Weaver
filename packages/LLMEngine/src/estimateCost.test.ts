import { describe, expect, it } from 'vitest'
import { estimateCostUsd } from './estimateCost.js'

describe('estimateCostUsd', () => {
  it('returns zero cost for local and player2 providers', () => {
    expect(
      estimateCostUsd({
        provider: 'local',
        model: 'qwen2.5-7b-instruct-q4_k_m',
        promptTokens: 1_000,
        completionTokens: 500
      })
    ).toBe(0)
    expect(
      estimateCostUsd({
        provider: 'player2',
        model: 'player2',
        promptTokens: 1_000,
        completionTokens: 500
      })
    ).toBe(0)
  })

  it('estimates positive USD cost for cloud providers', () => {
    const cost = estimateCostUsd({
      provider: 'openai',
      model: 'gpt-4o-mini',
      promptTokens: 1_000_000,
      completionTokens: 1_000_000
    })
    expect(cost).toBeGreaterThan(0)
  })
})
