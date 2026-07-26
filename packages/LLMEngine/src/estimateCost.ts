import type { ProviderId } from './providerConfig.js'

export type CostEstimateInput = {
  provider: ProviderId
  model: string
  promptTokens: number
  completionTokens: number
}

/** Approximate USD per 1M tokens — enough for relative spend visibility across providers. */
const CLOUD_RATES: Record<
  Exclude<ProviderId, 'local' | 'player2'>,
  { inputPerMillion: number; outputPerMillion: number }
> = {
  claude: { inputPerMillion: 3, outputPerMillion: 15 },
  openai: { inputPerMillion: 0.15, outputPerMillion: 0.6 },
  gemini: { inputPerMillion: 0.075, outputPerMillion: 0.3 },
  grok: { inputPerMillion: 3, outputPerMillion: 15 }
}

export function estimateCostUsd(input: CostEstimateInput): number {
  if (input.provider === 'local' || input.provider === 'player2') return 0
  const rates = CLOUD_RATES[input.provider]
  // model reserved for future per-model rate tables
  void input.model
  const inputCost = (input.promptTokens / 1_000_000) * rates.inputPerMillion
  const outputCost = (input.completionTokens / 1_000_000) * rates.outputPerMillion
  return roundUsd(inputCost + outputCost)
}

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
