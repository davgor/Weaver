import { describe, expect, it } from 'vitest'
import { installProgressPercent, toUiStatusPhase } from './llmTypes.js'

describe('toUiStatusPhase', () => {
  it('maps not_installed to missing for ElectronUi chrome', () => {
    expect(toUiStatusPhase('not_installed')).toBe('missing')
    expect(toUiStatusPhase('installing')).toBe('installing')
    expect(toUiStatusPhase('ready')).toBe('ready')
    expect(toUiStatusPhase('error')).toBe('error')
  })
})

describe('installProgressPercent', () => {
  it('prefers fraction when present', () => {
    expect(
      installProgressPercent({
        phase: 'installing',
        bytesDownloaded: 1,
        bytesTotal: 4,
        fraction: 0.25
      })
    ).toBe(25)
  })
})
