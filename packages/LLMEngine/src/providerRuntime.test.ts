import { describe, expect, it } from 'vitest'
import { createTextCompletionClient } from './createTextCompletionClient.js'
import { createProviderRuntime, type ProviderFetch } from './providerRuntime.js'
import { resolveProviderConfig, type ResolvedProviderConfig } from './providerConfig.js'
import type { LlmRuntime } from './types.js'

type FetchCall = {
  url: string
  init: RequestInit
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function jsonFetch(...responses: Response[]): { fetch: ProviderFetch; calls: FetchCall[] } {
  const calls: FetchCall[] = []
  const fetch: ProviderFetch = async (url, init) => {
    calls.push({ url, init })
    const response = responses.shift()
    if (!response) {
      throw new Error('Unexpected fetch call')
    }
    return response
  }
  return { fetch, calls }
}

function bodyJson(call: FetchCall): unknown {
  return JSON.parse(String(call.init.body))
}

function headers(call: FetchCall): Record<string, string> {
  return call.init.headers as Record<string, string>
}

function onlyCall(calls: FetchCall[]): FetchCall {
  const [call] = calls
  if (!call) {
    throw new Error('Expected one fetch call')
  }
  return call
}

function callAt(calls: FetchCall[], index: number): FetchCall {
  const call = calls[index]
  if (!call) {
    throw new Error(`Expected fetch call ${index}`)
  }
  return call
}

describe('createProviderRuntime Claude adapter', () => {
  it('calls Claude with the Anthropic messages API shape', async () => {
    const config = resolveProviderConfig(
      { provider: 'claude', claude: { apiKey: 'claude-key', model: 'claude-test' } },
      {}
    )
    const { fetch, calls } = jsonFetch(
      jsonResponse({ content: [{ type: 'text', text: 'anthropic text' }] })
    )
    const runtime = createProviderRuntime(config, { fetch, retry: { maxAttempts: 1 } })

    await expect(
      runtime.completeText({ prompt: 'Hello', context: 'Facts', maxTokens: 20 })
    ).resolves.toEqual({ text: 'anthropic text', backend: 'claude' })
    const call = onlyCall(calls)
    expect(call.url).toBe('https://api.anthropic.com/v1/messages')
    expect(headers(call)).toMatchObject({
      'content-type': 'application/json',
      'x-api-key': 'claude-key',
      'anthropic-version': '2023-06-01'
    })
    expect(bodyJson(call)).toEqual({
      model: 'claude-test',
      system: 'Facts',
      max_tokens: 20,
      messages: [{ role: 'user', content: 'Hello' }]
    })
  })
})

describe('createProviderRuntime OpenAI adapter', () => {
  it('calls OpenAI with chat completions', async () => {
    const config = resolveProviderConfig(
      { provider: 'openai', openai: { apiKey: 'openai-key', model: 'gpt-test' } },
      {}
    )
    const { fetch, calls } = jsonFetch(
      jsonResponse({ choices: [{ message: { content: 'openai text' } }] })
    )
    const runtime = createProviderRuntime(config, { fetch, retry: { maxAttempts: 1 } })

    await expect(
      runtime.completeText({ prompt: 'Prompt', context: 'Context', maxTokens: 16 })
    ).resolves.toEqual({ text: 'openai text', backend: 'openai' })
    const call = onlyCall(calls)
    expect(call.url).toBe('https://api.openai.com/v1/chat/completions')
    expect(headers(call)).toMatchObject({
      authorization: 'Bearer openai-key',
      'content-type': 'application/json'
    })
    expect(bodyJson(call)).toEqual({
      model: 'gpt-test',
      max_tokens: 16,
      messages: [
        { role: 'system', content: 'Context' },
        { role: 'user', content: 'Prompt' }
      ]
    })
  })
})

describe('createProviderRuntime Gemini adapter', () => {
  it('calls Gemini generateContent', async () => {
    const config = resolveProviderConfig(
      { provider: 'gemini', gemini: { apiKey: 'gemini-key', model: 'gemini-test' } },
      {}
    )
    const { fetch, calls } = jsonFetch(
      jsonResponse({
        candidates: [{ content: { parts: [{ text: 'gemini text' }] } }]
      })
    )
    const runtime = createProviderRuntime(config, { fetch, retry: { maxAttempts: 1 } })

    await expect(
      runtime.completeText({ prompt: 'Prompt', context: 'Context', maxTokens: 12 })
    ).resolves.toEqual({ text: 'gemini text', backend: 'gemini' })
    const call = onlyCall(calls)
    expect(call.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent?key=gemini-key'
    )
    expect(bodyJson(call)).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'Context\n\nPrompt' }] }],
      generationConfig: { maxOutputTokens: 12 }
    })
  })
})

describe('createProviderRuntime Grok adapter', () => {
  it('calls Grok with xAI OpenAI-compatible chat completions', async () => {
    const config = resolveProviderConfig(undefined, {
      AGENT_PROVIDER: 'grok',
      GROK_API_KEY: 'grok-key',
      GROK_MODEL: 'grok-test'
    })
    const { fetch, calls } = jsonFetch(
      jsonResponse({ choices: [{ message: { content: 'grok text' } }] })
    )
    const runtime = createProviderRuntime(config, { fetch, retry: { maxAttempts: 1 } })

    await expect(runtime.completeText({ prompt: 'Prompt' })).resolves.toEqual({
      text: 'grok text',
      backend: 'grok'
    })
    const call = onlyCall(calls)
    expect(call.url).toBe('https://api.x.ai/v1/chat/completions')
    expect(headers(call).authorization).toBe('Bearer grok-key')
    expect(bodyJson(call)).toEqual({
      model: 'grok-test',
      messages: [{ role: 'user', content: 'Prompt' }]
    })
  })
})

describe('createProviderRuntime Player2 adapter', () => {
  it('calls Player2 on localhost without an API key and retries cold starts', async () => {
    const config = resolveProviderConfig({ provider: 'player2' }, {})
    const delays: number[] = []
    const { fetch, calls } = jsonFetch(
      jsonResponse({ error: { message: 'starting' } }, 503),
      jsonResponse({ choices: [{ message: { content: 'player2 text' } }] })
    )
    const runtime = createProviderRuntime(config, {
      fetch,
      retry: {
        maxAttempts: 2,
        initialDelayMs: 3,
        sleep: async (ms) => {
          delays.push(ms)
        }
      }
    })

    await expect(runtime.completeText({ prompt: 'Prompt' })).resolves.toEqual({
      text: 'player2 text',
      backend: 'player2'
    })
    expect(calls).toHaveLength(2)
    const firstCall = callAt(calls, 0)
    expect(firstCall.url).toBe('http://127.0.0.1:4315/v1/chat/completions')
    expect(headers(firstCall).authorization).toBeUndefined()
    expect(delays).toEqual([3])
  })
})

describe('createTextCompletionClient', () => {
  it('selects a cloud provider from environment config', async () => {
    const { fetch } = jsonFetch(
      jsonResponse({ choices: [{ message: { content: 'env selected' } }] })
    )
    const client = createTextCompletionClient({
      env: {
        AGENT_PROVIDER: 'openai',
        OPENAI_API_KEY: 'env-key',
        OPENAI_MODEL: 'env-model'
      },
      fetch,
      retry: { maxAttempts: 1 }
    })

    await expect(client.completeText({ prompt: 'Prompt' })).resolves.toEqual({
      text: 'env selected',
      backend: 'openai'
    })
  })

  it('can delegate the local provider to an injected local runtime', async () => {
    const localRuntime: LlmRuntime = {
      completeText: async () => ({ text: 'local text', backend: 'cpu' }),
      dispose: async () => undefined
    }
    const client = createTextCompletionClient({
      settings: { provider: 'local' },
      localRuntime
    })

    await expect(client.completeText({ prompt: 'Prompt' })).resolves.toEqual({
      text: 'local text',
      backend: 'cpu'
    })
  })

  it('requires an injected local runtime for the local provider path', () => {
    const config: ResolvedProviderConfig = { provider: 'local' }
    expect(() => createProviderRuntime(config)).toThrow(/localRuntime/i)
  })
})
