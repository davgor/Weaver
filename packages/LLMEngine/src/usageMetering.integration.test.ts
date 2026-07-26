import { describe, expect, it } from 'vitest'
import { createTextCompletionClient } from './createTextCompletionClient.js'
import { createProviderRuntime, type ProviderFetch } from './providerRuntime.js'
import { resolveProviderConfig } from './providerConfig.js'
import { createUsageMeter } from './usageMeter.js'
import type { LlmRuntime } from './types.js'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

function jsonFetch(...responses: Response[]): ProviderFetch {
  return async () => {
    const response = responses.shift()
    if (!response) throw new Error('Unexpected fetch call')
    return response
  }
}

describe('providerRuntime usage metering — openai', () => {
  it('meters every adapter completion so provider calls cannot bypass recording', async () => {
    const meter = createUsageMeter()
    const runtime = createOpenAiMeteredRuntime(meter)
    await runtime.completeText({ prompt: 'Hello', purpose: 'guided-identity' })
    expect(meter.aggregateByPurpose()).toEqual([
      {
        purpose: 'guided-identity',
        eventCount: 1,
        promptTokens: 12,
        completionTokens: 4,
        totalTokens: 16,
        estimatedCostUsd: expect.any(Number)
      }
    ])
    expect(meter.listEvents()[0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-test',
      purpose: 'guided-identity'
    })
  })
})

describe('providerRuntime usage metering — local', () => {
  it('records local provider tokens at zero cost through the same wrap', async () => {
    const meter = createUsageMeter()
    const localRuntime: LlmRuntime = {
      completeText: async () => ({ text: 'local reply text', backend: 'cpu' }),
      dispose: async () => undefined
    }
    const runtime = createProviderRuntime(
      { provider: 'local' },
      { meter, localRuntime, retry: { maxAttempts: 1 } }
    )

    await runtime.completeText({ prompt: 'prompt text', purpose: 'campaign-create' })
    const [event] = meter.listEvents()
    expect(event).toMatchObject({
      provider: 'local',
      purpose: 'campaign-create',
      estimatedCostUsd: 0
    })
    expect(event?.totalTokens).toBeGreaterThan(0)
  })
})

describe('createTextCompletionClient usage metering', () => {
  it('uses the injected meter for cloud completions', async () => {
    const meter = createUsageMeter()
    const client = createTextCompletionClient({
      settings: { provider: 'claude', claude: { apiKey: 'k', model: 'claude-test' } },
      meter,
      fetch: jsonFetch(
        jsonResponse({
          content: [{ type: 'text', text: 'anthropic' }],
          usage: { input_tokens: 9, output_tokens: 3 }
        })
      ),
      retry: { maxAttempts: 1 }
    })

    await client.completeText({ prompt: 'Hi', purpose: 'turn-narration' })
    expect(meter.listEvents()).toEqual([
      expect.objectContaining({
        provider: 'claude',
        model: 'claude-test',
        purpose: 'turn-narration',
        promptTokens: 9,
        completionTokens: 3,
        totalTokens: 12
      })
    ])
  })
})

function createOpenAiMeteredRuntime(meter: ReturnType<typeof createUsageMeter>): LlmRuntime {
  const config = resolveProviderConfig(
    { provider: 'openai', openai: { apiKey: 'k', model: 'gpt-test' } },
    {}
  )
  return createProviderRuntime(config, {
    meter,
    fetch: jsonFetch(
      jsonResponse({
        choices: [{ message: { content: 'ok' } }],
        usage: { prompt_tokens: 12, completion_tokens: 4, total_tokens: 16 }
      })
    ),
    retry: { maxAttempts: 1 }
  })
}
