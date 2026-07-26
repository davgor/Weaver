import { describe, expect, it } from 'vitest'
import {
  aggregateUsageByProvider,
  buildActiveProviderSummary,
  buildUsageTimeRange,
  formatTokenCount,
  formatUsd,
  sumPurposeRows,
  type UsageEventSnapshot,
  type UsagePurposeRow
} from './llmUsageDashboard.js'

describe('buildUsageTimeRange', () => {
  const now = new Date('2026-07-26T12:00:00.000Z')

  it('returns undefined for all-time', () => {
    expect(buildUsageTimeRange('all', now)).toBeUndefined()
  })

  it('returns a 24-hour window', () => {
    const range = buildUsageTimeRange('24h', now)
    expect(range?.from?.toISOString()).toBe('2026-07-25T12:00:00.000Z')
    expect(range?.to).toEqual(now)
  })

  it('returns a 7-day window', () => {
    const range = buildUsageTimeRange('7d', now)
    expect(range?.from?.toISOString()).toBe('2026-07-19T12:00:00.000Z')
  })
})

const aggregateUsageEvents: UsageEventSnapshot[] = [
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    purpose: 'turn-narration',
    promptTokens: 100,
    completionTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: 0.01,
    recordedAt: '2026-07-26T10:00:00.000Z'
  },
  {
    provider: 'openai',
    model: 'gpt-4o-mini',
    purpose: 'ask-dm',
    promptTokens: 80,
    completionTokens: 40,
    totalTokens: 120,
    estimatedCostUsd: 0.008,
    recordedAt: '2026-07-26T11:00:00.000Z'
  },
  {
    provider: 'local',
    model: 'qwen2.5-7b-instruct-q4_k_m',
    purpose: 'turn-narration',
    promptTokens: 200,
    completionTokens: 100,
    totalTokens: 300,
    estimatedCostUsd: 0,
    recordedAt: '2026-07-26T11:30:00.000Z'
  }
]

describe('aggregateUsageByProvider', () => {
  it('groups token and cost totals by provider', () => {
    expect(aggregateUsageByProvider(aggregateUsageEvents)).toEqual([
      {
        provider: 'local',
        eventCount: 1,
        promptTokens: 200,
        completionTokens: 100,
        totalTokens: 300,
        estimatedCostUsd: 0,
        models: ['qwen2.5-7b-instruct-q4_k_m']
      },
      {
        provider: 'openai',
        eventCount: 2,
        promptTokens: 180,
        completionTokens: 90,
        totalTokens: 270,
        estimatedCostUsd: 0.018,
        models: ['gpt-4o-mini']
      }
    ])
  })

  it('returns an empty list for no events', () => {
    expect(aggregateUsageByProvider([])).toEqual([])
  })
})

describe('sumPurposeRows', () => {
  it('totals purpose aggregates', () => {
    const rows: UsagePurposeRow[] = [
      {
        purpose: 'ask-dm',
        eventCount: 1,
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
        estimatedCostUsd: 0.001
      },
      {
        purpose: 'turn-narration',
        eventCount: 2,
        promptTokens: 20,
        completionTokens: 8,
        totalTokens: 28,
        estimatedCostUsd: 0.002
      }
    ]

    expect(sumPurposeRows(rows)).toEqual({
      purpose: 'Total',
      eventCount: 3,
      promptTokens: 30,
      completionTokens: 13,
      totalTokens: 43,
      estimatedCostUsd: 0.003
    })
  })
})

describe('buildActiveProviderSummary', () => {
  it('describes a ready local runtime', () => {
    const summary = buildActiveProviderSummary(
      {
        phase: 'ready',
        backend: 'vulkan',
        model: { id: 'qwen2.5-7b-instruct-q4_k_m', displayName: 'Qwen2.5 7B Instruct (Q4_K_M)' },
        error: null
      },
      'vulkan'
    )

    expect(summary).toEqual({
      providerLabel: 'local',
      modelLabel: 'Qwen2.5 7B Instruct (Q4_K_M)',
      statusLabel: 'Ready',
      backendLabel: 'vulkan',
      detail: 'Local model ready on vulkan backend.'
    })
  })

  it('describes a not-installed runtime', () => {
    const summary = buildActiveProviderSummary({
      phase: 'not_installed',
      backend: null,
      model: { id: 'qwen2.5-7b-instruct-q4_k_m', displayName: 'Qwen2.5 7B Instruct (Q4_K_M)' },
      error: null
    })

    expect(summary.statusLabel).toBe('Not Installed')
    expect(summary.detail).toMatch(/not installed/i)
  })
})

describe('formatUsd', () => {
  it('formats small costs with precision', () => {
    expect(formatUsd(0.018)).toBe('$0.018000')
    expect(formatUsd(0)).toBe('$0.000000')
  })
})

describe('formatTokenCount', () => {
  it('formats integers with grouping', () => {
    expect(formatTokenCount(12345)).toBe('12,345')
  })
})
