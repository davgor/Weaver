import { describe, expect, it } from 'vitest'
import { resolveAutoUpdater } from './resolveAutoUpdater.js'

describe('resolveAutoUpdater', () => {
  it('prefers autoUpdater on the CJS default export (Node ESM interop)', () => {
    const fromDefault = { checkForUpdates: () => undefined }
    const fromNamed = { checkForUpdates: () => undefined }
    expect(
      resolveAutoUpdater({
        default: { autoUpdater: fromDefault },
        autoUpdater: fromNamed
      })
    ).toBe(fromDefault)
  })

  it('falls back to a named autoUpdater export when default is missing', () => {
    const named = { checkForUpdates: () => undefined }
    expect(resolveAutoUpdater({ autoUpdater: named })).toBe(named)
  })

  it('throws when neither shape exposes autoUpdater', () => {
    expect(() => resolveAutoUpdater({})).toThrow(/autoUpdater export not found/)
  })
})
