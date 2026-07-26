import { describe, expect, it } from 'vitest'
import { createLlmEngine, createUsageMeter } from '@weaver/llm-engine'
import { buildCatalog, dispatchEngineCall } from './engineDispatch.js'

function memoryFiles(existing = new Set<string>()) {
  return {
    exists: (path: string) => existing.has(path),
    ensureDir: () => undefined,
    join: (...parts: string[]) => parts.join('/')
  }
}

function createMeteredLlmEngine() {
  const meter = createUsageMeter()
  const engine = createLlmEngine({
    dataDir: '/data',
    files: memoryFiles(),
    downloader: { download: async () => undefined },
    probe: { supportsVulkan: () => false },
    createRuntime: async ({ backend }) => ({
      completeText: async () => ({ text: 'contract smoke', backend }),
      dispose: async () => undefined
    }),
    meter
  })
  meter.record({
    provider: 'openai',
    model: 'gpt-4o-mini',
    purpose: 'admin-contract',
    promptTokens: 42,
    completionTokens: 21,
    estimatedCostUsd: 0.0042
  })
  meter.record({
    provider: 'local',
    model: 'qwen2.5-7b-instruct-q4_k_m',
    purpose: 'turn-narration',
    promptTokens: 100,
    completionTokens: 50,
    estimatedCostUsd: 0
  })
  return engine
}

describe('ElectronAdmin LLMEngine usage metering contract — catalog', () => {
  it('catalogs usage query endpoints on the real published API', () => {
    const engine = createMeteredLlmEngine()
    const catalog = buildCatalog([engine])

    expect(catalog[0]?.endpoints).toEqual(
      expect.arrayContaining([
        {
          name: 'queryUsageByPurpose',
          description: 'Aggregate recorded LLM usage by purpose (optional from/to time range)'
        },
        {
          name: 'listUsageEvents',
          description: 'List recorded LLM usage events (optional from/to time range)'
        }
      ])
    )
  })
})

describe('ElectronAdmin LLMEngine usage metering contract — queryUsageByPurpose', () => {
  it('dispatches through dispatchEngineCall', async () => {
    const engine = createMeteredLlmEngine()
    const result = await dispatchEngineCall([engine], 'LLMEngine', 'queryUsageByPurpose')

    expect(result.engineId).toBe('LLMEngine')
    expect(result.endpoint).toBe('queryUsageByPurpose')
    expect(result.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          purpose: 'admin-contract',
          eventCount: 1,
          totalTokens: 63,
          estimatedCostUsd: 0.0042
        }),
        expect.objectContaining({
          purpose: 'turn-narration',
          eventCount: 1,
          totalTokens: 150,
          estimatedCostUsd: 0
        })
      ])
    )
  })
})

describe('ElectronAdmin LLMEngine usage metering contract — listUsageEvents', () => {
  it('dispatches with an optional time range payload', async () => {
    const engine = createMeteredLlmEngine()
    const from = new Date('2026-01-01T00:00:00.000Z')
    const to = new Date('2026-12-31T23:59:59.999Z')
    const result = await dispatchEngineCall([engine], 'LLMEngine', 'listUsageEvents', { from, to })

    expect(result.payload).toEqual({ from, to })
    expect(result.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'openai', purpose: 'admin-contract' }),
        expect.objectContaining({ provider: 'local', purpose: 'turn-narration' })
      ])
    )
  })
})

describe('ElectronAdmin LLMEngine usage metering contract — provider status', () => {
  it('dispatches status and connection-check endpoints', async () => {
    const engine = createMeteredLlmEngine()

    const status = await dispatchEngineCall([engine], 'LLMEngine', 'getStatus')
    expect(status.result).toMatchObject({
      phase: expect.any(String),
      model: expect.objectContaining({ id: 'qwen2.5-7b-instruct-q4_k_m' })
    })

    const backend = await dispatchEngineCall([engine], 'LLMEngine', 'resolveBackend')
    expect(backend.result).toBe('cpu')
  })
})
