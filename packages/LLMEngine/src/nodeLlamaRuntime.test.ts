import { beforeEach, describe, expect, it, vi } from 'vitest'

const disposeLlama = vi.fn(async () => {})
const disposeModel = vi.fn(async () => {})
const disposeContext = vi.fn(async () => {})
const prompt = vi.fn(async (text: string, options?: { maxTokens?: number }) => {
  return `out:${text}:${options?.maxTokens ?? 'none'}`
})

const getLlama = vi.fn(async ({ gpu }: { gpu: 'vulkan' | false }) => ({
  gpu,
  loadModel: vi.fn(async () => ({
    createContext: vi.fn(async () => ({
      getSequence: () => ({ id: 'seq' }),
      dispose: disposeContext
    })),
    dispose: disposeModel
  })),
  dispose: disposeLlama
}))

class LlamaChatSession {
  opts: { contextSequence: unknown; systemPrompt?: string }
  constructor(opts: { contextSequence: unknown; systemPrompt?: string }) {
    this.opts = opts
  }
  prompt = prompt
}

vi.mock('node-llama-cpp', () => ({
  getLlama,
  LlamaChatSession
}))

function resetLlamaMocks(): void {
  vi.clearAllMocks()
  getLlama.mockImplementation(async ({ gpu }: { gpu: 'vulkan' | false }) => ({
    gpu,
    loadModel: vi.fn(async () => ({
      createContext: vi.fn(async () => ({
        getSequence: () => ({ id: 'seq' }),
        dispose: disposeContext
      })),
      dispose: disposeModel
    })),
    dispose: disposeLlama
  }))
}

describe('probeVulkanWithNodeLlama', () => {
  beforeEach(resetLlamaMocks)

  it('probes vulkan success and failure', async () => {
    const { probeVulkanWithNodeLlama } = await import('./nodeLlamaRuntime.js')
    expect(await probeVulkanWithNodeLlama()).toBe(true)
    expect(disposeLlama).toHaveBeenCalled()

    getLlama.mockRejectedValueOnce(new Error('no vulkan'))
    expect(await probeVulkanWithNodeLlama()).toBe(false)
  })
})

describe('createNodeLlamaRuntime completion', () => {
  beforeEach(resetLlamaMocks)

  it('creates a runtime that completes with context and maxTokens', async () => {
    const { createNodeLlamaRuntime } = await import('./nodeLlamaRuntime.js')
    const runtime = await createNodeLlamaRuntime({
      modelPath: '/tmp/model.gguf',
      backend: 'vulkan'
    })
    expect(getLlama).toHaveBeenCalledWith({ gpu: 'vulkan' })

    const result = await runtime.completeText({
      prompt: 'hi',
      context: 'be brief',
      maxTokens: 16
    })
    expect(result).toEqual({ text: 'out:hi:16', backend: 'vulkan' })
    expect(prompt).toHaveBeenCalledWith('hi', { maxTokens: 16 })

    await runtime.dispose()
    expect(disposeContext).toHaveBeenCalled()
    expect(disposeModel).toHaveBeenCalled()
    expect(disposeLlama).toHaveBeenCalled()
  })
})

describe('createNodeLlamaRuntime options', () => {
  beforeEach(resetLlamaMocks)

  it('uses cpu gpu option and omits maxTokens / context when absent', async () => {
    const { createNodeLlamaRuntime } = await import('./nodeLlamaRuntime.js')
    const runtime = await createNodeLlamaRuntime({
      modelPath: '/tmp/model.gguf',
      backend: 'cpu'
    })
    expect(getLlama).toHaveBeenCalledWith({ gpu: false })

    const result = await runtime.completeText({
      prompt: 'yo'
    })
    expect(result.text).toBe('out:yo:none')
    expect(prompt).toHaveBeenCalledWith('yo')
  })
})
