import { describe, expect, it } from 'vitest'
import { formatAlwaysOnGrounding } from './alwaysOnGrounding.js'

describe('formatAlwaysOnGrounding', () => {
  it('renders fixed always-on fields in stable order', () => {
    const text = formatAlwaysOnGrounding({
      currentHp: 'HP 8/14',
      presentNpcs: 'Mira',
      activeCombatState: 'initiative rolled'
    })

    expect(text).toContain('Current HP: HP 8/14')
    expect(text).toContain('Present NPCs: Mira')
    expect(text).toContain('Active combat: initiative rolled')
    expect(text.indexOf('Current HP')).toBeLessThan(text.indexOf('Present NPCs'))
    expect(text.indexOf('Present NPCs')).toBeLessThan(text.indexOf('Active combat'))
  })

  it('omits unset fields', () => {
    const text = formatAlwaysOnGrounding({ currentHp: 'HP 20/20' })
    expect(text).toContain('Current HP: HP 20/20')
    expect(text).not.toContain('Present NPCs')
    expect(text).not.toContain('Active combat')
  })
})
