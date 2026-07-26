import { describe, expect, it } from 'vitest'
import {
  ContextBudgetExceededError,
  estimateTokens,
  truncateToTokenBudget
} from './tokenBudget.js'

describe('estimateTokens', () => {
  it('uses chars/4 heuristic rounded up', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('abcd')).toBe(1)
    expect(estimateTokens('abcde')).toBe(2)
  })
})

describe('truncateToTokenBudget', () => {
  it('returns text unchanged when within budget', () => {
    expect(truncateToTokenBudget('short', 10)).toBe('short')
  })

  it('appends truncation marker when over budget', () => {
    const long = 'x'.repeat(100)
    const result = truncateToTokenBudget(long, 5)
    expect(result.endsWith('[TRUNCATED]')).toBe(true)
    expect(estimateTokens(result)).toBeLessThanOrEqual(5)
  })
})

describe('ContextBudgetExceededError', () => {
  it('is a named Error subclass', () => {
    const error = new ContextBudgetExceededError('over budget')
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ContextBudgetExceededError')
    expect(error.message).toBe('over budget')
  })
})
