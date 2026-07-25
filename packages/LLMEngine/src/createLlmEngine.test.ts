import { describe, expect, it, vi } from 'vitest'
import { createLlmEngine } from './createLlmEngine.js'
import { DEFAULT_MODEL } from './modelCatalog.js'
import type { CreateRuntime, FileStore } from './types.js'

function memoryFiles(existing = new Set<string>()): FileStore {
  return {
    exists: (path) => existing.has(path),
    ensureDir: () => undefined,
    join: (...parts) => parts.join('/')
  }
}

function stubRuntime(): CreateRuntime {
  return async () => ({
    complete: async () => ({ text: '', backend: 'cpu' }),
    dispose: async () => undefined
  })
}

describe('createLlmEngine — complete gate', () => {
  it('refuses complete when the model is not installed', async () => {
    const createRuntime = vi.fn<CreateRuntime>()
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => true },
      createRuntime
    })
    await expect(
      engine.complete({ messages: [{ role: 'user', content: 'hi' }] })
    ).rejects.toThrow(/not installed/i)
    expect(createRuntime).not.toHaveBeenCalled()
  })

  it('completes through the injected runtime after install', async () => {
    const existing = new Set<string>()
    const createRuntime = vi.fn<CreateRuntime>(async ({ backend }) => ({
      complete: async () => ({ text: 'hello from fake', backend }),
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
    const reply = await engine.complete({
      messages: [{ role: 'user', content: 'ping' }]
    })
    expect(reply).toEqual({ text: 'hello from fake', backend: 'vulkan' })
    expect(createRuntime).toHaveBeenCalledWith({
      modelPath: `/data/models/${DEFAULT_MODEL.filename}`,
      backend: 'vulkan'
    })
  })
})

describe('createLlmEngine — admin endpoints', () => {
  it('exposes admin endpoints including status and model spec', async () => {
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => false },
      createRuntime: stubRuntime()
    })
    const names = engine.listEndpoints().map((e) => e.name)
    expect(names).toEqual(
      expect.arrayContaining(['health', 'describeRole', 'getStatus', 'getModelSpec', 'resolveBackend'])
    )
    await expect(engine.call('resolveBackend')).resolves.toBe('cpu')
    await expect(engine.call('getModelSpec')).resolves.toMatchObject({
      id: DEFAULT_MODEL.id
    })
  })

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
