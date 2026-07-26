import { describe, expect, it } from 'vitest'
import { classifyPlayerIntent } from './classifyIntent.js'

describe('classifyPlayerIntent', () => {
  it('classifies buy phrasing as buy, never narration', () => {
    expect(classifyPlayerIntent('I buy the iron sword from the merchant')).toBe('buy')
    expect(classifyPlayerIntent('purchase a healing potion')).toBe('buy')
  })

  it('classifies sell phrasing as sell, never narration', () => {
    expect(classifyPlayerIntent('I sell the rusty dagger')).toBe('sell')
  })

  it('classifies travel phrasing as travel, never narration', () => {
    expect(classifyPlayerIntent('I travel to Riverford')).toBe('travel')
    expect(classifyPlayerIntent('we journey toward the hills')).toBe('travel')
    expect(classifyPlayerIntent('head to the eastern gate')).toBe('travel')
  })

  it('falls back to narration for non-commerce, non-travel prose', () => {
    expect(classifyPlayerIntent('I look around the tavern')).toBe('narration')
    expect(classifyPlayerIntent('ask the bartender about rumors')).toBe('narration')
  })
})
