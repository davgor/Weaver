import { estimateCostUsd } from './estimateCost.js'
import { estimateTokenUsage } from './estimateTokens.js'
import type { ProviderId } from './providerConfig.js'
import type { LlmRuntime, TextRequest, TextResponse } from './types.js'
import type { TokenUsage, UsageMeter } from './usageTypes.js'

export type MeteredRuntimeOptions = {
  meter: UsageMeter
  provider: ProviderId
  model: string
  now?: () => Date
}

export type MeasuredTextResponse = TextResponse & {
  usage?: TokenUsage
}

const DEFAULT_PURPOSE = 'unspecified'

export function wrapWithUsageMetering(
  runtime: LlmRuntime,
  options: MeteredRuntimeOptions
): LlmRuntime {
  return {
    completeText: (request) => completeAndRecord(runtime, options, request),
    dispose: () => runtime.dispose()
  }
}

async function completeAndRecord(
  runtime: LlmRuntime,
  options: MeteredRuntimeOptions,
  request: TextRequest
): Promise<TextResponse> {
  const measured = (await runtime.completeText(request)) as MeasuredTextResponse
  const usage = measured.usage ?? estimateTokenUsage(request, measured)
  options.meter.record({
    provider: options.provider,
    model: options.model,
    purpose: request.purpose ?? DEFAULT_PURPOSE,
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    estimatedCostUsd: estimateCostUsd({
      provider: options.provider,
      model: options.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens
    }),
    recordedAt: options.now?.() ?? new Date()
  })
  return { text: measured.text, backend: measured.backend }
}
