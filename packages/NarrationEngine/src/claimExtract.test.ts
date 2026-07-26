import { describe, expect, it } from 'vitest'
import { extractClaims, stripClaimBlock } from './claimExtract.js'

describe('extractClaims', () => {
  it('extracts labeled npc, item, and location claims from generated prose', () => {
    const raw = [
      'Mira waits by the river.',
      '<<<CLAIMS',
      'npcPresent:npc-mira',
      'itemExists:item-lantern',
      'locationName:Riverbend',
      '>>>'
    ].join('\n')

    expect(extractClaims(raw)).toEqual([
      { kind: 'npcPresent', npcId: 'npc-mira' },
      { kind: 'itemExists', itemId: 'item-lantern' },
      { kind: 'locationName', name: 'Riverbend' }
    ])
    expect(stripClaimBlock(raw)).toBe('Mira waits by the river.')
  })

  it('returns no claims when the labeled block is absent', () => {
    expect(extractClaims('Just flavor text.')).toEqual([])
    expect(stripClaimBlock('Just flavor text.')).toBe('Just flavor text.')
  })
})
