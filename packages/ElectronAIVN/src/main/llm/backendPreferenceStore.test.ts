import { describe, expect, it } from 'vitest'
import {
  createMemoryPrefsFs,
  readBackendPreference,
  readFirstRunDismissed,
  writeBackendPreference,
  writeFirstRunDismissed
} from './backendPreferenceStore.js'

describe('backendPreferenceStore', () => {
  it('returns null when no preference file exists', async () => {
    const fs = createMemoryPrefsFs()
    await expect(readBackendPreference(fs, '/prefs.json')).resolves.toBeNull()
  })

  it('persists vulkan or cpu across reads', async () => {
    const fs = createMemoryPrefsFs()
    await writeBackendPreference(fs, '/prefs.json', 'vulkan')
    await expect(readBackendPreference(fs, '/prefs.json')).resolves.toBe('vulkan')
    await writeBackendPreference(fs, '/prefs.json', 'cpu')
    await expect(readBackendPreference(fs, '/prefs.json')).resolves.toBe('cpu')
  })

  it('preserves backend when toggling first-run dismissed', async () => {
    const fs = createMemoryPrefsFs()
    await writeBackendPreference(fs, '/prefs.json', 'cpu')
    await expect(readFirstRunDismissed(fs, '/prefs.json')).resolves.toBe(false)
    await writeFirstRunDismissed(fs, '/prefs.json', true)
    await expect(readFirstRunDismissed(fs, '/prefs.json')).resolves.toBe(true)
    await expect(readBackendPreference(fs, '/prefs.json')).resolves.toBe('cpu')
  })
})
