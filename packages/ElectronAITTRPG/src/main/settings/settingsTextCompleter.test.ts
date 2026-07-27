import { describe, expect, it, vi } from 'vitest'
import type { LlmRuntime } from '@weaver/llm-engine'
import { createSettingsBackedTextCompleter } from './settingsTextCompleter.js'

describe('createSettingsBackedTextCompleter', () => {
  it('delegates completeText to the active Settings client', async () => {
    const completeText = vi.fn(async () => ({ text: 'live reply', backend: 'openai' as const }))
    const active: LlmRuntime = { completeText, dispose: async () => undefined }
    const completer = createSettingsBackedTextCompleter({
      getActiveTextClient: () => active,
      createFallbackClient: () => {
        throw new Error('fallback should not run')
      }
    })

    await expect(completer.completeText({ prompt: 'hi', context: 'facts' })).resolves.toEqual({
      text: 'live reply',
      backend: 'openai'
    })
    expect(completeText).toHaveBeenCalledWith({ prompt: 'hi', context: 'facts' })
  })

  it('uses the fallback client when Settings has no active client yet', async () => {
    const completer = createSettingsBackedTextCompleter({
      getActiveTextClient: () => null,
      createFallbackClient: () => ({
        completeText: async () => ({ text: 'fallback', backend: 'cpu' }),
        dispose: async () => undefined
      })
    })

    await expect(completer.completeText({ prompt: 'x' })).resolves.toEqual({
      text: 'fallback',
      backend: 'cpu'
    })
  })

  it('prefers a newly applied active client over a prior fallback', preferLiveOverFallback)

  it('reuses one fallback client across calls when Settings stays empty', reuseFallback)
})

async function preferLiveOverFallback(): Promise<void> {
  let active: LlmRuntime | null = null
  const completer = createSettingsBackedTextCompleter({
    getActiveTextClient: () => active,
    createFallbackClient: () => ({
      completeText: async () => ({ text: 'fallback', backend: 'cpu' }),
      dispose: async () => undefined
    })
  })

  await expect(completer.completeText({ prompt: '1' })).resolves.toMatchObject({ text: 'fallback' })
  active = {
    completeText: async () => ({ text: 'live', backend: 'claude' }),
    dispose: async () => undefined
  }
  await expect(completer.completeText({ prompt: '2' })).resolves.toMatchObject({ text: 'live' })
}

async function reuseFallback(): Promise<void> {
  const createFallbackClient = vi.fn((): LlmRuntime => ({
    completeText: async () => ({ text: 'fallback', backend: 'cpu' }),
    dispose: async () => undefined
  }))
  const completer = createSettingsBackedTextCompleter({
    getActiveTextClient: () => null,
    createFallbackClient
  })

  await completer.completeText({ prompt: 'a' })
  await completer.completeText({ prompt: 'b' })
  expect(createFallbackClient).toHaveBeenCalledTimes(1)
}
