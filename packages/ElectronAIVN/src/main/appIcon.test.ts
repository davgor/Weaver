import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import { resolveBrowserWindowIconPath } from './appIcon.js'

describe('resolveBrowserWindowIconPath', () => {
  it('uses resourcesPath/icon.png when packaged', () => {
    expect(
      resolveBrowserWindowIconPath({
        isPackaged: true,
        appPath: 'C:\\repo\\packages\\ElectronAIVN',
        resourcesPath: 'C:\\resources'
      })
    ).toBe(join('C:\\resources', 'icon.png'))
  })

  it('uses build/icon.png from the app path in development', () => {
    expect(
      resolveBrowserWindowIconPath({
        isPackaged: false,
        appPath: 'C:\\repo\\packages\\ElectronAIVN',
        resourcesPath: 'C:\\resources'
      })
    ).toBe(join('C:\\repo\\packages\\ElectronAIVN', 'build', 'icon.png'))
  })
})
