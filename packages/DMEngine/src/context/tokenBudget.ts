export const TRUNCATION_MARKER = '[TRUNCATED]'

export function estimateTokens(text: string): number {
  if (text.length === 0) {
    return 0
  }
  return Math.ceil(text.length / 4)
}

export function truncateToTokenBudget(
  text: string,
  maxTokens: number,
  marker: string = TRUNCATION_MARKER
): string {
  if (estimateTokens(text) <= maxTokens) {
    return text
  }

  const markerTokens = estimateTokens(marker)
  const contentBudget = Math.max(maxTokens - markerTokens, 0)
  const maxChars = contentBudget * 4
  return `${text.slice(0, maxChars)}${marker}`
}

export class ContextBudgetExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ContextBudgetExceededError'
  }
}
