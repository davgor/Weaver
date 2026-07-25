import { describe, expect, it } from 'vitest'
import { formatAvailableCopy, formatDownloadingCopy } from './updateBannerCopy'

describe('update banner copy', () => {
  it('formats available and downloading messages', () => {
    expect(formatAvailableCopy('1.0.0', '1.1.0')).toBe('Update available: v1.0.0 → v1.1.0')
    expect(formatAvailableCopy('1.0.0')).toBe('Update available')
    expect(formatDownloadingCopy(42, '1.1.0')).toBe('Downloading v1.1.0… 42%')
    expect(formatDownloadingCopy(undefined, '1.1.0')).toBe('Downloading v1.1.0…')
  })
})
