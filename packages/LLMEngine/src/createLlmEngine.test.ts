import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { createLlmEngine } from './createLlmEngine.js'
import { DEFAULT_MODEL } from './modelCatalog.js'
import { createUsageMeter } from './usageMeter.js'
import type { CreateRuntime, FileStore, TextRequest, TextResponse } from './types.js'

function memoryFiles(existing = new Set<string>()): FileStore {
  return {
    exists: (path) => existing.has(path),
    ensureDir: () => undefined,
    join: (...parts) => parts.join('/')
  }
}

function stubRuntime(): CreateRuntime {
  return async () => ({
    completeText: async () => ({ text: '', backend: 'cpu' }),
    dispose: async () => undefined
  })
}

describe('createLlmEngine — completeText contract', () => {
  it('publishes only prompt/context/maxTokens in and text/backend out', () => {
    expectTypeOf<TextRequest>().toEqualTypeOf<{
      prompt: string
      context?: string
      maxTokens?: number
      purpose?: string
    }>()
    expectTypeOf<TextResponse>().toEqualTypeOf<{
      text: string
      backend: 'vulkan' | 'cpu' | 'claude' | 'openai' | 'gemini' | 'grok' | 'player2'
    }>()
  })
})

describe('createLlmEngine — completeText install gate', () => {
  it('refuses completeText when the model is not installed', async () => {
    const createRuntime = vi.fn<CreateRuntime>()
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => true },
      createRuntime
    })
    await expect(
      engine.completeText({ prompt: 'hi' })
    ).rejects.toThrow(/not installed/i)
    expect(createRuntime).not.toHaveBeenCalled()
  })
})

describe('createLlmEngine — completeText runtime', () => {
  it('completes raw text through the injected runtime after install', async () => {
    const existing = new Set<string>()
    let captured: TextRequest | null = null
    const createRuntime = vi.fn<CreateRuntime>(async ({ backend }) => ({
      completeText: async (request) => {
        captured = request
        return { text: 'hello from fake', backend }
      },
      dispose: async () => undefined
    }))
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(existing),
      downloader: {
        download: async (_url, dest) => {
          existing.add(dest)
        }
      },
      probe: { supportsVulkan: () => true },
      createRuntime
    })

    expect((await engine.getStatus()).phase).toBe('not_installed')
    await engine.install()
    const reply = await engine.completeText({
      prompt: 'ping',
      context: 'plain setting notes',
      maxTokens: 24
    })
    expect(reply).toEqual({ text: 'hello from fake', backend: 'vulkan' })
    expect(Object.keys(reply).sort()).toEqual(['backend', 'text'])
    expect(captured).toEqual({
      prompt: 'ping',
      context: 'plain setting notes',
      maxTokens: 24
    })
    expect(Object.keys(captured ?? {}).sort()).toEqual(['context', 'maxTokens', 'prompt'])
    expect(createRuntime).toHaveBeenCalledWith({
      modelPath: `/data/models/${DEFAULT_MODEL.filename}`,
      backend: 'vulkan'
    })
  })
})

describe('createLlmEngine — deprecated complete wrapper', () => {
  it('keeps deprecated complete as a thin chat-to-text wrapper', async () => {
    const existing = new Set<string>()
    let captured: TextRequest | null = null
    const createRuntime = vi.fn<CreateRuntime>(async ({ backend }) => ({
      completeText: async (request) => {
        captured = request
        return { text: 'wrapped', backend }
      },
      dispose: async () => undefined
    }))
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(existing),
      downloader: {
        download: async (_url, dest) => {
          existing.add(dest)
        }
      },
      probe: { supportsVulkan: () => false },
      createRuntime
    })

    await engine.install()
    await expect(
      engine.complete({
        messages: [
          { role: 'system', content: 'world facts only' },
          { role: 'user', content: 'first request' },
          { role: 'assistant', content: 'prior reply' },
          { role: 'user', content: 'latest request' }
        ],
        maxTokens: 12
      })
    ).resolves.toEqual({ text: 'wrapped', backend: 'cpu' })
    expect(captured).toEqual({
      prompt: 'latest request',
      context: 'world facts only',
      maxTokens: 12
    })
  })
})

describe('createLlmEngine — admin endpoints', () => {
  it('exposes admin endpoints including install and completeText', async () => {
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => false },
      createRuntime: stubRuntime()
    })
    const names = engine.listEndpoints().map((e) => e.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'health',
        'describeRole',
        'getStatus',
        'install',
        'getModelSpec',
        'resolveBackend',
        'completeText'
      ])
    )
    await expect(engine.call('resolveBackend')).resolves.toBe('cpu')
    await expect(engine.call('getModelSpec')).resolves.toMatchObject({
      id: DEFAULT_MODEL.id
    })
  })
})

describe('createLlmEngine — admin payload compatibility', () => {
  it('accepts an optional payload without breaking existing endpoints', async () => {
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => false },
      createRuntime: stubRuntime()
    })
    await expect(engine.call('getModelSpec', { probe: true })).resolves.toMatchObject({
      id: DEFAULT_MODEL.id
    })
  })
})

describe('createLlmEngine — admin completeText smoke', () => {
  it('exercises completeText through the admin call path', async () => {
    const existing = new Set<string>()
    let captured: TextRequest | null = null
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(existing),
      downloader: {
        download: async (_url, dest) => {
          existing.add(dest)
        }
      },
      probe: { supportsVulkan: () => false },
      createRuntime: async ({ backend }) => ({
        completeText: async (request) => {
          captured = request
          return { text: 'admin smoke', backend }
        },
        dispose: async () => undefined
      })
    })

    await expect(engine.call('install')).resolves.toMatchObject({ phase: 'ready' })
    await expect(
      engine.call('completeText', {
        prompt: 'Say hello',
        context: 'Admin smoke test',
        maxTokens: 8
      })
    ).resolves.toEqual({ text: 'admin smoke', backend: 'cpu' })
    expect(captured).toEqual({
      prompt: 'Say hello',
      context: 'Admin smoke test',
      maxTokens: 8
    })
  })
})

describe('createLlmEngine — usage metering', () => {
  it('records local completions at zero cost and exposes purpose aggregates', async () => {
    const meter = createUsageMeter()
    const existing = new Set<string>()
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(existing),
      downloader: {
        download: async (_url, dest) => {
          existing.add(dest)
        }
      },
      probe: { supportsVulkan: () => false },
      createRuntime: async ({ backend }) => ({
        completeText: async () => ({ text: 'metered local', backend }),
        dispose: async () => undefined
      }),
      meter
    })

    await engine.install()
    await engine.completeText({ prompt: 'hello world', purpose: 'turn-narration' })
    expect(engine.queryUsageByPurpose()).toEqual([
      {
        purpose: 'turn-narration',
        eventCount: 1,
        promptTokens: expect.any(Number),
        completionTokens: expect.any(Number),
        totalTokens: expect.any(Number),
        estimatedCostUsd: 0
      }
    ])
    expect(engine.listUsageEvents()[0]).toMatchObject({
      provider: 'local',
      model: DEFAULT_MODEL.id,
      purpose: 'turn-narration',
      estimatedCostUsd: 0
    })
  })
})
