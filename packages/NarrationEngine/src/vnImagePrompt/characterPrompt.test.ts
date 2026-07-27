import { describe, expect, it } from 'vitest'
import { buildVnCharacterPrompt, type VnCharacterIdentitySeed, type VnStance } from '../index.js'

describe('buildVnCharacterPrompt', () => {
  it('builds the required short label format', () => {
    const prompt = buildVnCharacterPrompt({
      identity: david(),
      stance: 'Standing',
      expression: 'Angry'
    })

    expect(prompt.label).toBe("David's character, Standing, Angry")
  })

  it('includes anime style, no-background framing, identity, stance, and expression', () => {
    const prompt = buildVnCharacterPrompt({
      identity: david(),
      stance: 'Fighting',
      expression: 'Surprised'
    })

    expect(prompt.fullPrompt).toMatch(/anime visual novel style/i)
    expect(prompt.fullPrompt).toMatch(/no background/i)
    expect(prompt.fullPrompt).toMatch(/subject-only/i)
    expect(prompt.fullPrompt).toContain('silver-haired swordsman in a blue travel coat')
    expect(prompt.fullPrompt).toContain('Stance: Fighting')
    expect(prompt.fullPrompt).toContain('Expression: Surprised')
  })

  it('keeps a stable style-lock substring for the same character key', () => {
    const first = buildVnCharacterPrompt({
      identity: david(),
      stance: 'Standing',
      expression: 'Neutral'
    })
    const second = buildVnCharacterPrompt({
      identity: { ...david(), appearance: 'same hero in rain-damp cloak' },
      stance: 'Sitting',
      expression: 'Happy'
    })
    const third = buildVnCharacterPrompt({
      identity: { ...david(), characterKey: 'david-alt' },
      stance: 'Standing',
      expression: 'Neutral'
    })

    const lock = styleLockLine(first.fullPrompt)
    expect(second.fullPrompt).toContain(lock)
    expect(styleLockLine(third.fullPrompt)).not.toBe(lock)
  })

  it('rejects invalid stance or expression combinations', () => {
    expect(() =>
      buildVnCharacterPrompt({
        identity: david(),
        stance: 'Floating' as VnStance,
        expression: 'Neutral'
      })
    ).toThrow(/stance/i)
  })
})

function david(): VnCharacterIdentitySeed {
  return {
    characterKey: 'hero-david',
    displayName: 'David',
    appearance: 'silver-haired swordsman in a blue travel coat'
  }
}

function styleLockLine(prompt: string): string {
  const line = prompt.split('\n').find((entry) => entry.startsWith('Style lock:'))
  if (line === undefined) {
    throw new Error('Missing style lock line')
  }
  return line
}
