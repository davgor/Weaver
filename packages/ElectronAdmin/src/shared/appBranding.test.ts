import { describe, expect, it } from 'vitest'
import { APP_DISPLAY_NAME, APP_EXE_NAME } from './appBranding.js'

describe('appBranding', () => {
  it('uses AI ADMIN as the user-visible product name', () => {
    expect(APP_DISPLAY_NAME).toBe('AI ADMIN')
  })

  it('uses a hyphenated Windows executable name', () => {
    expect(APP_EXE_NAME).toBe('AI-ADMIN.exe')
  })
})
