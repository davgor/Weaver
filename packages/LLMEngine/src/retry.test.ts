import { describe, expect, it } from 'vitest'
import { retryWithBackoff } from './retry.js'

describe('retryWithBackoff', () => {
  it('retries with capped exponential delays from an injected sleeper', async () => {
    const delays: number[] = []
    let attempts = 0

    const result = await retryWithBackoff(
      async () => {
        attempts += 1
        if (attempts < 3) {
          throw new Error('runtime is still starting')
        }
        return 'ready'
      },
      {
        maxAttempts: 3,
        initialDelayMs: 5,
        maxDelayMs: 8,
        factor: 2,
        sleep: async (ms) => {
          delays.push(ms)
        },
        shouldRetry: () => true
      }
    )

    expect(result).toBe('ready')
    expect(attempts).toBe(3)
    expect(delays).toEqual([5, 8])
  })

  it('does not retry when the classifier rejects the error', async () => {
    const delays: number[] = []
    let attempts = 0

    await expect(
      retryWithBackoff(
        async () => {
          attempts += 1
          throw new Error('bad api key')
        },
        {
          maxAttempts: 3,
          initialDelayMs: 1,
          sleep: async (ms) => {
            delays.push(ms)
          },
          shouldRetry: () => false
        }
      )
    ).rejects.toThrow(/bad api key/i)

    expect(attempts).toBe(1)
    expect(delays).toEqual([])
  })
})
