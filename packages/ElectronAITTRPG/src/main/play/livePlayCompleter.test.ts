import { describe, expect, it } from 'vitest'
import type { TextCompleter } from '@weaver/narration-engine'
import { createLiveResolveTurnDeps } from './livePlayDeps.js'

describe('createLiveResolveTurnDeps', () => {
  it('uses the injected Settings completer for route and narration llm', async () => {
    const completer: TextCompleter = {
      completeText: async () => ({ text: 'from-settings', backend: 'claude' })
    }
    const deps = createLiveResolveTurnDeps(completer)
    await expect(deps.completer.completeText({ prompt: 'route' })).resolves.toEqual({
      text: 'from-settings',
      backend: 'claude'
    })
    await expect(deps.narration.llm.completeText({ prompt: 'scene' })).resolves.toEqual({
      text: 'from-settings',
      backend: 'claude'
    })
  })
})
