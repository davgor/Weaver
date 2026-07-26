import type { LlmBackend } from './backend.js'
import type { CreateRuntime, LlmRuntime, TextRequest } from './types.js'

type LlamaModule = {
  getLlama: (options: { gpu: 'vulkan' | false }) => Promise<{
    gpu: string | false
    loadModel: (options: { modelPath: string }) => Promise<LlamaModel>
    dispose: () => Promise<void>
  }>
  LlamaChatSession: new (options: {
    contextSequence: unknown
    systemPrompt?: string
  }) => {
    prompt: (text: string, options?: { maxTokens?: number }) => Promise<string>
  }
}

type LlamaModel = {
  createContext: () => Promise<{
    getSequence: () => unknown
    dispose: () => Promise<void>
  }>
  dispose: () => Promise<void>
}

export const createNodeLlamaRuntime: CreateRuntime = async ({ modelPath, backend }) => {
  const llamaCpp = (await import('node-llama-cpp')) as unknown as LlamaModule
  const llama = await llamaCpp.getLlama({ gpu: gpuOption(backend) })
  const model = await llama.loadModel({ modelPath })
  const context = await model.createContext()
  return buildRuntime({ llamaCpp, llama, model, context, backend })
}

export async function probeVulkanWithNodeLlama(): Promise<boolean> {
  try {
    const llamaCpp = (await import('node-llama-cpp')) as unknown as LlamaModule
    const llama = await llamaCpp.getLlama({ gpu: 'vulkan' })
    const ok = llama.gpu === 'vulkan'
    await llama.dispose()
    return ok
  } catch {
    return false
  }
}

function gpuOption(backend: LlmBackend): 'vulkan' | false {
  return backend === 'vulkan' ? 'vulkan' : false
}

function buildRuntime(parts: {
  llamaCpp: LlamaModule
  llama: Awaited<ReturnType<LlamaModule['getLlama']>>
  model: LlamaModel
  context: Awaited<ReturnType<LlamaModel['createContext']>>
  backend: LlmBackend
}): LlmRuntime {
  const { llamaCpp, llama, model, context, backend } = parts
  return {
    completeText: (request) => completeWithSession(llamaCpp, context, backend, request),
    dispose: async () => {
      await context.dispose()
      await model.dispose()
      await llama.dispose()
    }
  }
}

async function completeWithSession(
  llamaCpp: LlamaModule,
  context: Awaited<ReturnType<LlamaModel['createContext']>>,
  backend: LlmBackend,
  request: TextRequest
): Promise<{ text: string; backend: LlmBackend }> {
  const session = createSession(llamaCpp, context, request.context)
  const text = await promptSession(session, request.prompt, request.maxTokens)
  return { text, backend }
}

function createSession(
  llamaCpp: LlamaModule,
  context: Awaited<ReturnType<LlamaModel['createContext']>>,
  systemPrompt: string | undefined
) {
  if (systemPrompt) {
    return new llamaCpp.LlamaChatSession({
      contextSequence: context.getSequence(),
      systemPrompt
    })
  }
  return new llamaCpp.LlamaChatSession({
    contextSequence: context.getSequence()
  })
}

function promptSession(
  session: { prompt: (text: string, options?: { maxTokens?: number }) => Promise<string> },
  text: string,
  maxTokens: number | undefined
): Promise<string> {
  if (maxTokens === undefined) {
    return session.prompt(text)
  }
  return session.prompt(text, { maxTokens })
}

