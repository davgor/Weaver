import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { resolveBrowserWindowIconPath } from './appIcon.js'

describe('resolveBrowserWindowIconPath', () => {
  it('uses packaged resources icon when the app is packaged', () => {
    expect(
      resolveBrowserWindowIconPath({
        isPackaged: true,
        appPath: 'C:\\app',
        resourcesPath: 'C:\\resources'
      })
    ).toBe(join('C:\\resources', 'icon.png'))
  })

  it('uses build/icon.png from the app path in development', () => {
    expect(
      resolveBrowserWindowIconPath({
        isPackaged: false,
        appPath: 'C:\\repo\\packages\\ElectronAITTRPG',
        resourcesPath: 'C:\\resources'
      })
    ).toBe(join('C:\\repo\\packages\\ElectronAITTRPG', 'build', 'icon.png'))
  })
})
