import type { TextRequest, TextResponse } from './types.js'
import type { TokenUsage } from './usageTypes.js'

/** Rough token estimate when a provider omits usage (local / Player2 / missing fields). */
export function estimateTokenUsage(request: TextRequest, response: TextResponse): TokenUsage {
  return {
    promptTokens: estimateTextTokens(combinedPrompt(request)),
    completionTokens: estimateTextTokens(response.text)
  }
}

export function estimateTextTokens(text: string): number {
  if (text.length === 0) return 0
  return Math.max(1, Math.ceil(text.length / 4))
}

function combinedPrompt(request: TextRequest): string {
  return request.context === undefined ? request.prompt : `${request.context}\n\n${request.prompt}`
}
