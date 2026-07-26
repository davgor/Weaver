import { describe, expect, it } from 'vitest'
import { assembleAgentContext } from './assembleAgentContext.js'
import { ContextBudgetExceededError, estimateTokens } from './tokenBudget.js'

const alwaysOn = {
  currentHp: 'HP 12/20',
  presentNpcs: 'Greta, Brom',
  activeCombatState: 'Round 2, player turn'
}

describe('assembleAgentContext within budget', () => {
  it('assembles always-on, RAG, and extras within token cap', () => {
    const result = assembleAgentContext({
      alwaysOn,
      ragChunks: [{ id: 'a', text: 'The vault was sealed long ago.' }],
      extras: ['Player asked about the sigil.'],
      maxTokens: 200
    })

    expect(result.prompt).toContain('HP 12/20')
    expect(result.prompt).toContain('Greta, Brom')
    expect(result.prompt).toContain('Round 2, player turn')
    expect(result.prompt).toContain('vault was sealed')
    expect(result.prompt).toContain('sigil')
    expect(result.tokenCount).toBeLessThanOrEqual(200)
    expect(result.truncated).toBe(false)
    expect(result.ragIncluded).toBe(1)
  })

  it('never displaces always-on grounding when RAG is large', () => {
    const hugeRag = Array.from({ length: 20 }, (_, index) => ({
      id: `chunk-${index}`,
      text: `Lore paragraph ${index}: ${'ancient '.repeat(40)}`
    }))

    const result = assembleAgentContext({
      alwaysOn,
      ragChunks: hugeRag,
      maxTokens: 120
    })

    expect(result.prompt).toContain('HP 12/20')
    expect(result.prompt).toContain('Greta, Brom')
    expect(result.prompt).toContain('Round 2, player turn')
    expect(result.tokenCount).toBeLessThanOrEqual(120)
    expect(result.truncated).toBe(true)
    expect(result.ragIncluded).toBeLessThan(hugeRag.length)
  })
})

describe('assembleAgentContext budget overflow', () => {
  it('truncates always-on and drops RAG when always-on alone exceeds budget', () => {
    const result = assembleAgentContext({
      alwaysOn: {
        currentHp: 'x'.repeat(400),
        presentNpcs: 'y'.repeat(400),
        activeCombatState: 'z'.repeat(400)
      },
      ragChunks: [{ id: 'rag', text: 'Should not appear in prompt.' }],
      maxTokens: 50
    })

    expect(result.prompt).toContain('[TRUNCATED]')
    expect(result.prompt).not.toContain('Should not appear')
    expect(result.tokenCount).toBeLessThanOrEqual(50)
    expect(result.truncated).toBe(true)
    expect(result.ragIncluded).toBe(0)
  })
})

describe('assembleAgentContext hard fail', () => {
  it('throws ContextBudgetExceededError in hard-fail mode when always-on exceeds budget', () => {
    expect(() =>
      assembleAgentContext({
        alwaysOn: { currentHp: 'x'.repeat(500) },
        ragChunks: [],
        maxTokens: 10,
        hardFailOnBudgetExceeded: true
      })
    ).toThrow(ContextBudgetExceededError)
  })
})

describe('assembleAgentContext cap enforcement', () => {
  it('budget-exceeded test proves cap is enforced for every assembly', () => {
    for (const input of budgetStressScenarios) {
      const result = assembleAgentContext({ ...input, extras: input.extras })
      expect(result.tokenCount).toBeLessThanOrEqual(input.maxTokens)
      expect(estimateTokens(result.prompt)).toBeLessThanOrEqual(input.maxTokens)
    }
  })
})

const budgetStressScenarios = [
  {
    alwaysOn: { currentHp: 'HP 1/1' },
    ragChunks: [{ id: '1', text: 'a'.repeat(10_000) }],
    extras: ['b'.repeat(10_000)],
    maxTokens: 25
  },
  {
    alwaysOn: {
      currentHp: 'c'.repeat(800),
      presentNpcs: 'd'.repeat(800),
      activeCombatState: 'e'.repeat(800)
    },
    ragChunks: Array.from({ length: 50 }, (_, i) => ({
      id: `${i}`,
      text: `fact-${i}-${'z'.repeat(200)}`
    })),
    maxTokens: 40
  }
] as const
