import { describe, expect, it } from 'vitest'
import type { TextCompleter } from '@weaver/narration-engine'
import { createLiveGenerationDeps } from './runGeneration.js'

describe('createLiveGenerationDeps Settings completer', () => {
  it('uses the injected Settings-backed completer instead of a silent scripted default', async () => {
    const completer: TextCompleter = {
      completeText: async () => ({ text: '<<<CANON>>>from-settings<<</CANON>>>', backend: 'openai' })
    }
    const deps = createLiveGenerationDeps(completer)
    await expect(deps.completer.completeText({ prompt: 'seed' })).resolves.toMatchObject({
      text: expect.stringContaining('from-settings'),
      backend: 'openai'
    })
  })
})
