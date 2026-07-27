import { describe, expect, it, vi } from 'vitest'
import { warmLocalRuntime } from './warmRuntime.js'
import type { LocalLlmWarmPort } from './llmPorts.js'

describe('warmLocalRuntime', () => {
  it('issues a tiny completeText call to bring up the runtime', async () => {
    const completeText = vi.fn(async () => ({ text: 'ok', backend: 'cpu' as const }))
    const port: LocalLlmWarmPort = { completeText }
    await warmLocalRuntime(port)
    expect(completeText).toHaveBeenCalledWith({ prompt: 'ok', maxTokens: 1 })
  })
})
