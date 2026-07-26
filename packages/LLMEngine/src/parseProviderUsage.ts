import type { TokenUsage } from './usageTypes.js'

export function parseOpenAiUsage(json: unknown): TokenUsage | undefined {
  const usage = recordField(json, 'usage')
  return readPair(usage, 'prompt_tokens', 'completion_tokens')
}

export function parseClaudeUsage(json: unknown): TokenUsage | undefined {
  const usage = recordField(json, 'usage')
  return readPair(usage, 'input_tokens', 'output_tokens')
}

export function parseGeminiUsage(json: unknown): TokenUsage | undefined {
  const usage = recordField(json, 'usageMetadata')
  return readPair(usage, 'promptTokenCount', 'candidatesTokenCount')
}

function readPair(
  usage: Record<string, unknown> | undefined,
  promptKey: string,
  completionKey: string
): TokenUsage | undefined {
  if (!usage) return undefined
  const promptTokens = asTokenCount(usage[promptKey])
  const completionTokens = asTokenCount(usage[completionKey])
  if (promptTokens === undefined || completionTokens === undefined) return undefined
  return { promptTokens, completionTokens }
}

function recordField(json: unknown, name: string): Record<string, unknown> | undefined {
  if (!isRecord(json)) return undefined
  const value = json[name]
  return isRecord(value) ? value : undefined
}

function asTokenCount(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return undefined
  return Math.floor(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
