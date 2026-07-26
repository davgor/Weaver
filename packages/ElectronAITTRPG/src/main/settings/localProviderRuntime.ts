import type { LlmEngineApi, LlmRuntime } from '@weaver/llm-engine'

export function createLocalProviderRuntime(
  engine: Pick<LlmEngineApi, 'completeText'>
): LlmRuntime {
  return {
    completeText: (request) => engine.completeText(request),
    dispose: async () => undefined
  }
}
