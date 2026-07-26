import { describe, expect, it } from 'vitest'
import { createUsageMeter } from './usageMeter.js'
import { wrapWithUsageMetering } from './meteredRuntime.js'
import type { LlmRuntime, TextRequest, TextResponse } from './types.js'

function stubRuntime(response: TextResponse & { usage?: { promptTokens: number; completionTokens: number } }): LlmRuntime {
  return {
    completeText: async () => response,
    dispose: async () => undefined
  }
}

describe('wrapWithUsageMetering — cloud usage', () => {
  it('records a usage event for every completion and returns a plain text/backend response', async () => {
    const meter = createUsageMeter()
    const runtime = wrapWithUsageMetering(
      stubRuntime({
        text: 'hello',
        backend: 'openai',
        usage: { promptTokens: 11, completionTokens: 7 }
      }),
      {
        meter,
        provider: 'openai',
        model: 'gpt-test',
        now: () => new Date('2026-02-01T00:00:00.000Z')
      }
    )

    const reply = await runtime.completeText({
      prompt: 'Hi',
      purpose: 'turn-narration'
    })
    expect(reply).toEqual({ text: 'hello', backend: 'openai' })
    expect(Object.keys(reply).sort()).toEqual(['backend', 'text'])
    expect(meter.listEvents()).toEqual([
      expect.objectContaining({
        provider: 'openai',
        model: 'gpt-test',
        purpose: 'turn-narration',
        promptTokens: 11,
        completionTokens: 7,
        totalTokens: 18,
        estimatedCostUsd: expect.any(Number),
        recordedAt: new Date('2026-02-01T00:00:00.000Z')
      })
    ])
    expect(meter.listEvents()[0]?.estimatedCostUsd).toBeGreaterThan(0)
  })
})

describe('wrapWithUsageMetering — local / defaults', () => {
  it('records local/player2 token counts with zero cost when usage is missing', async () => {
    const meter = createUsageMeter()
    const runtime = wrapWithUsageMetering(
      stubRuntime({ text: 'abcd', backend: 'player2' }),
      {
        meter,
        provider: 'player2',
        model: 'player2',
        now: () => new Date('2026-02-02T00:00:00.000Z')
      }
    )
    const request: TextRequest = { prompt: 'abcdefgh', purpose: 'campaign-create' }
    await runtime.completeText(request)

    const [event] = meter.listEvents()
    expect(event).toMatchObject({
      provider: 'player2',
      model: 'player2',
      purpose: 'campaign-create',
      estimatedCostUsd: 0
    })
    expect(event?.promptTokens).toBeGreaterThan(0)
    expect(event?.completionTokens).toBeGreaterThan(0)
  })

  it('defaults missing purpose to unspecified', async () => {
    const meter = createUsageMeter()
    const runtime = wrapWithUsageMetering(stubRuntime({ text: 'x', backend: 'cpu' }), {
      meter,
      provider: 'local',
      model: 'qwen2.5-7b-instruct-q4_k_m'
    })
    await runtime.completeText({ prompt: 'x' })
    expect(meter.listEvents()[0]?.purpose).toBe('unspecified')
    expect(meter.listEvents()[0]?.estimatedCostUsd).toBe(0)
  })
})
