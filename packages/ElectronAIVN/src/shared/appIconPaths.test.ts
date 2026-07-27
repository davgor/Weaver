import { describe, expect, it } from 'vitest'
import {
  APP_BRAND_MARK_ASSET,
  APP_ICON_BUILD_ICO,
  APP_ICON_BUILD_PNG,
  APP_ICON_RESOURCE_NAME
} from './appIconPaths.js'

describe('appIconPaths', () => {
  it('documents build icon paths for packaging and window chrome', () => {
    expect(APP_ICON_BUILD_ICO).toBe('build/icon.ico')
    expect(APP_ICON_BUILD_PNG).toBe('build/icon.png')
    expect(APP_ICON_RESOURCE_NAME).toBe('icon.png')
  })

  it('documents the in-app brand mark asset path', () => {
    expect(APP_BRAND_MARK_ASSET).toBe('src/renderer/src/assets/app-icon.png')
  })
})
