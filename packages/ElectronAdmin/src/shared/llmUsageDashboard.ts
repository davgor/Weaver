export type TimeRangePreset = 'all' | '24h' | '7d' | '30d'

export type UsageEventSnapshot = {
  provider: string
  model: string
  purpose: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  recordedAt: string | Date
}

export type UsagePurposeRow = {
  purpose: string
  eventCount: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
}

export type UsageProviderRow = {
  provider: string
  eventCount: number
  promptTokens: number
  completionTokens: number
  totalTokens: number
  estimatedCostUsd: number
  models: string[]
}

export type LlmStatusSnapshot = {
  phase: string
  backend: string | null
  model: { id: string; displayName: string }
  error: string | null
}

export type ActiveProviderSummary = {
  providerLabel: string
  modelLabel: string
  statusLabel: string
  backendLabel: string | null
  detail: string
}

const RANGE_MS: Record<Exclude<TimeRangePreset, 'all'>, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000
}

export function buildUsageTimeRange(
  preset: TimeRangePreset,
  now = new Date()
): { from?: Date; to?: Date } | undefined {
  if (preset === 'all') return undefined
  return {
    from: new Date(now.getTime() - RANGE_MS[preset]),
    to: now
  }
}

export function aggregateUsageByProvider(events: UsageEventSnapshot[]): UsageProviderRow[] {
  const byProvider = new Map<string, UsageProviderRow>()
  for (const event of events) {
    const current = byProvider.get(event.provider) ?? emptyProviderRow(event.provider)
    const models = current.models.includes(event.model)
      ? current.models
      : [...current.models, event.model].sort()
    byProvider.set(event.provider, {
      provider: event.provider,
      eventCount: current.eventCount + 1,
      promptTokens: current.promptTokens + event.promptTokens,
      completionTokens: current.completionTokens + event.completionTokens,
      totalTokens: current.totalTokens + event.totalTokens,
      estimatedCostUsd: roundCost(current.estimatedCostUsd + event.estimatedCostUsd),
      models
    })
  }
  return [...byProvider.values()].sort((a, b) => a.provider.localeCompare(b.provider))
}

export function sumPurposeRows(rows: UsagePurposeRow[]): UsagePurposeRow {
  return rows.reduce(
    (total, row) => ({
      purpose: 'Total',
      eventCount: total.eventCount + row.eventCount,
      promptTokens: total.promptTokens + row.promptTokens,
      completionTokens: total.completionTokens + row.completionTokens,
      totalTokens: total.totalTokens + row.totalTokens,
      estimatedCostUsd: roundCost(total.estimatedCostUsd + row.estimatedCostUsd)
    }),
    emptyPurposeRow('Total')
  )
}

export function buildActiveProviderSummary(
  status: LlmStatusSnapshot,
  resolvedBackend?: string | null
): ActiveProviderSummary {
  const backendLabel = resolvedBackend ?? status.backend
  const statusLabel = formatPhase(status.phase)
  const providerLabel = 'local'
  const modelLabel = status.model.displayName

  if (status.phase === 'ready') {
    return {
      providerLabel,
      modelLabel,
      statusLabel,
      backendLabel,
      detail: `Local model ready on ${backendLabel ?? 'unknown'} backend.`
    }
  }

  if (status.phase === 'installing') {
    return {
      providerLabel,
      modelLabel,
      statusLabel,
      backendLabel,
      detail: 'Local model install in progress.'
    }
  }

  if (status.phase === 'error') {
    return {
      providerLabel,
      modelLabel,
      statusLabel,
      backendLabel,
      detail: status.error ?? 'Local runtime reported an error.'
    }
  }

  return {
    providerLabel,
    modelLabel,
    statusLabel,
    backendLabel,
    detail: 'Local model is not installed yet.'
  }
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(6)}`
}

export function formatTokenCount(count: number): string {
  return new Intl.NumberFormat('en-US').format(count)
}

function emptyProviderRow(provider: string): UsageProviderRow {
  return {
    provider,
    eventCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0,
    models: []
  }
}

function emptyPurposeRow(purpose: string): UsagePurposeRow {
  return {
    purpose,
    eventCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0
  }
}

function formatPhase(phase: string): string {
  return phase
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
