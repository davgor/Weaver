import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME, APP_EXE_NAME, BOOT_BRAND_TITLE } from './appBranding.js'

describe('appBranding', () => {
  it('uses AI Visual Novel as the user-visible product name', () => {
    expect(APP_DISPLAY_NAME).toBe('AI Visual Novel')
  })

  it('uses a hyphenated Windows executable name', () => {
    expect(APP_EXE_NAME).toBe('AI-Visual-Novel.exe')
  })

  it('brands the boot loading screen with Weaver', () => {
    expect(BOOT_BRAND_TITLE).toBe('AI Visual Novel powered by Weaver')
  })
})
