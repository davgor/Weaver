import { describe, expect, it } from 'vitest'
import { createLlmEngine } from '@weaver/llm-engine'
import { getLocalModelStatus, installLocalModel } from './localModelInstall.js'

describe('ElectronAIVN → LLMEngine contract', () => {
  it('reports not_installed when the model file is absent', async () => {
    const engine = createContractEngine(new Set<string>())
    await expect(engine.resolveBackend()).resolves.toBe('cpu')
    await expect(engine.getStatus()).resolves.toMatchObject({ phase: 'not_installed' })
    await expect(getLocalModelStatus(engine)).resolves.toMatchObject({ phase: 'not_installed' })
  })

  it('installs through LLMEngine install with progress (no live download)', async () => {
    const existing = new Set<string>()
    const engine = createContractEngine(existing)
    const progress: Array<{ fraction: number | null }> = []

    await expect(engine.getStatus()).resolves.toMatchObject({ phase: 'not_installed' })
    const status = await installLocalModel(engine, (event) => progress.push(event))
    expect(progress).toHaveLength(1)
    expect(status).toMatchObject({ phase: 'ready', backend: 'cpu' })
    await expect(engine.getStatus()).resolves.toMatchObject({ phase: 'ready' })
  })

  it('honors preferred Vulkan probe when constructing createLlmEngine', async () => {
    const existing = new Set<string>()
    const engine = createContractEngine(existing, true)
    await installLocalModel(engine)
    await expect(engine.resolveBackend()).resolves.toBe('vulkan')
    await expect(engine.getStatus()).resolves.toMatchObject({ phase: 'ready', backend: 'vulkan' })
  })
})

function createContractEngine(existing: Set<string>, preferVulkan = false) {
  return createLlmEngine({
    dataDir: '/tmp/weaver-aivn-contract',
    files: {
      exists: (path) => existing.has(path),
      ensureDir: () => undefined,
      join: (...parts) => parts.join('/')
    },
    downloader: {
      download: async (_url, destPath, onProgress) => {
        onProgress({ phase: 'installing', bytesDownloaded: 100, bytesTotal: 200, fraction: 0.5 })
        existing.add(destPath)
      }
    },
    probe: { supportsVulkan: async () => preferVulkan },
    createRuntime: async ({ backend }) => ({
      completeText: async () => ({ text: 'ok', backend }),
      dispose: async () => undefined
    })
  })
}
