import type { ProviderId } from './providerConfig.js'

export type TokenUsage = {
  promptTokens: number
  completionTokens: number
}

export type UsageEventInput = {
  provider: ProviderId
  model: string
  purpose: string
  promptTokens: number
  completionTokens: number
  estimatedCostUsd: number
  recordedAt?: Date
}

export type UsageEvent = {
  id: string
  provider: ProviderId
  model: string
  purpose: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  recordedAt: Date
}

export type UsageTimeRange = {
  from?: Date
  to?: Date
}

export type UsagePurposeAggregate = {
  purpose: string
  eventCount: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

export type UsageMeter = {
  record: (input: UsageEventInput) => UsageEvent
  listEvents: (range?: UsageTimeRange) => UsageEvent[]
  aggregateByPurpose: (range?: UsageTimeRange) => UsagePurposeAggregate[]
  clear: () => void
}
