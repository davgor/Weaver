import { describe, expect, it } from 'vitest'
import { generateWithConsistency, vnCharacterStyleLockId, vnSeedFromIdentity } from './index.js'

describe('vnCharacterStyleLockId', () => {
  it('is stable per character key and differs across keys', () => {
    expect(vnCharacterStyleLockId('hero-david')).toBe(vnCharacterStyleLockId('hero-david'))
    expect(vnCharacterStyleLockId('hero-david')).not.toBe(vnCharacterStyleLockId('hero-mira'))
    expect(vnCharacterStyleLockId('hero-david')).toMatch(/^vn-character-/)
  })
})

describe('vnSeedFromIdentity', () => {
  it('derives a deterministic seed from the character key', () => {
    const seed = vnSeedFromIdentity({ characterKey: 'hero-david' })
    expect(seed).toBe(vnSeedFromIdentity({ characterKey: 'hero-david' }))
    expect(seed).toContain(vnCharacterStyleLockId('hero-david'))
    expect(seed).toMatch(/^vn-seed-/)
  })
})

describe('generateWithConsistency', () => {
  it('returns the first acceptable image without extra attempts', async () => {
    let calls = 0
    const result = await generateWithConsistency(
      async () => {
        calls += 1
        return '/img/a.png'
      },
      { maxAttempts: 2 }
    )

    expect(result).toEqual({ imagePath: '/img/a.png' })
    expect(calls).toBe(1)
  })

  it('retries when generation returns null then succeeds', async () => {
    const outputs: Array<string | null> = [null, '/img/b.png']
    let calls = 0
    const result = await generateWithConsistency(async () => outputs[calls++] ?? null, {
      maxAttempts: 2
    })

    expect(result).toEqual({ imagePath: '/img/b.png' })
    expect(calls).toBe(2)
  })

  it('retries unacceptable images and degrades after exhausting attempts', async () => {
    let calls = 0
    const result = await generateWithConsistency(
      async () => {
        calls += 1
        return '/img/bad.png'
      },
      { maxAttempts: 2 },
      () => false
    )

    expect(result).toEqual({ degraded: true })
    expect(calls).toBe(2)
  })

  it('degrades when every attempt returns null', async () => {
    const result = await generateWithConsistency(async () => null, { maxAttempts: 3 })
    expect(result).toEqual({ degraded: true })
  })

  it('supports async acceptability checks', async () => {
    const result = await generateWithConsistency(
      async () => '/img/c.png',
      { maxAttempts: 1 },
      async (imagePath) => imagePath.endsWith('.png')
    )
    expect(result).toEqual({ imagePath: '/img/c.png' })
  })
})
