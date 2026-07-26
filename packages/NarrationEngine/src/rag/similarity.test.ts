import { describe, expect, it } from 'vitest'
import { cosineSimilarity } from './similarity.js'

describe('cosineSimilarity', () => {
  it('returns zero for mismatched or empty vectors', () => {
    expect(cosineSimilarity([], [1, 2])).toBe(0)
    expect(cosineSimilarity([1, 2], [1])).toBe(0)
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0)
  })

  it('returns one for identical non-zero vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1)
  })

  it('returns zero for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0)
  })
})
