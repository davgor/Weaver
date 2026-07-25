import { describe, expect, it } from 'vitest'
import { resolvePreferredBackend } from './backend.js'

describe('resolvePreferredBackend', () => {
  it('prefers vulkan when the probe reports support', async () => {
    await expect(
      resolvePreferredBackend({ supportsVulkan: () => true })
    ).resolves.toBe('vulkan')
  })

  it('falls back to cpu when vulkan is unavailable', async () => {
    await expect(
      resolvePreferredBackend({ supportsVulkan: async () => false })
    ).resolves.toBe('cpu')
  })
})
