import { describe, expect, it } from 'vitest'
import { isBackendChoiceDisabled, selectBackend } from './backendChoice.js'

describe('backend choice helpers', () => {
  it('selects a requested backend when controls are enabled', () => {
    expect(selectBackend('vulkan', 'cpu', false)).toBe('cpu')
    expect(selectBackend('cpu', 'vulkan', false)).toBe('vulkan')
  })

  it('keeps the current backend while installing', () => {
    expect(selectBackend('vulkan', 'cpu', true)).toBe('vulkan')
  })

  it('disables backend choices for installing panels', () => {
    expect(isBackendChoiceDisabled('installing', false)).toBe(true)
    expect(isBackendChoiceDisabled('missing', true)).toBe(true)
    expect(isBackendChoiceDisabled('missing', false)).toBe(false)
  })
})
