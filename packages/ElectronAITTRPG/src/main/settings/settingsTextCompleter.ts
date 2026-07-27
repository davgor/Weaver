import type { LlmRuntime } from '@weaver/llm-engine'
import type { TextCompleter } from '@weaver/narration-engine'

type SettingsBackedTextCompleterOptions = {
  getActiveTextClient: () => LlmRuntime | null
  createFallbackClient: () => LlmRuntime
}

export function createSettingsBackedTextCompleter(
  options: SettingsBackedTextCompleterOptions
): TextCompleter {
  let fallback: LlmRuntime | null = null
  return {
    completeText: async (request) => {
      const client = options.getActiveTextClient() ?? (fallback ??= options.createFallbackClient())
      const response = await client.completeText(request)
      return { text: response.text, backend: String(response.backend) }
    }
  }
}
