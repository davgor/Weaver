import { describe, expect, it } from 'vitest'
import { createUsageMeter } from './usageMeter.js'
import type { UsageEventInput, UsageMeter, UsagePurposeAggregate } from './usageTypes.js'

function event(partial: Partial<UsageEventInput> & Pick<UsageEventInput, 'purpose'>): UsageEventInput {
  return {
    provider: 'openai',
    model: 'gpt-test',
    promptTokens: 10,
    completionTokens: 20,
    estimatedCostUsd: 0.001,
    recordedAt: new Date('2026-01-15T12:00:00.000Z'),
    ...partial
  }
}

describe('createUsageMeter — record', () => {
  it('records provider, model, purpose, tokens, and estimated cost', () => {
    const meter = createUsageMeter()
    const recorded = meter.record(
      event({
        purpose: 'turn-narration',
        provider: 'claude',
        model: 'claude-test',
        promptTokens: 100,
        completionTokens: 50,
        estimatedCostUsd: 0.0025
      })
    )
    expect(recorded).toMatchObject({
      provider: 'claude',
      model: 'claude-test',
      purpose: 'turn-narration',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      estimatedCostUsd: 0.0025
    })
    expect(recorded.id).toEqual(expect.any(String))
    expect(meter.listEvents()).toHaveLength(1)
  })
})

describe('createUsageMeter — aggregate by purpose', () => {
  it('aggregates token counts and cost by purpose', () => {
    const meter = createUsageMeter()
    meter.record(event({ purpose: 'campaign-create', promptTokens: 10, completionTokens: 5, estimatedCostUsd: 0.01 }))
    meter.record(event({ purpose: 'campaign-create', promptTokens: 20, completionTokens: 10, estimatedCostUsd: 0.02 }))
    meter.record(event({ purpose: 'guided-identity', promptTokens: 3, completionTokens: 2, estimatedCostUsd: 0.005 }))

    expect(meter.aggregateByPurpose()).toEqual([
      {
        purpose: 'campaign-create',
        eventCount: 2,
        promptTokens: 30,
        completionTokens: 15,
        totalTokens: 45,
        estimatedCostUsd: 0.03
      },
      {
        purpose: 'guided-identity',
        eventCount: 1,
        promptTokens: 3,
        completionTokens: 2,
        totalTokens: 5,
        estimatedCostUsd: 0.005
      }
    ])
  })
})

describe('createUsageMeter — time range', () => {
  it('filters aggregates and events by time range', () => {
    const meter = seedTimeRangeMeter()
    const range = {
      from: new Date('2026-01-15T00:00:00.000Z'),
      to: new Date('2026-01-31T00:00:00.000Z')
    }
    expect(meter.listEvents(range)).toHaveLength(2)
    expect(meter.aggregateByPurpose(range)).toEqual(expectedTimeRangeAggregates())
  })
})

function seedTimeRangeMeter(): UsageMeter {
  const meter = createUsageMeter()
  meter.record(
    event({
      purpose: 'turn-narration',
      recordedAt: new Date('2026-01-10T00:00:00.000Z'),
      promptTokens: 1,
      completionTokens: 1,
      estimatedCostUsd: 0.1
    })
  )
  meter.record(
    event({
      purpose: 'turn-narration',
      recordedAt: new Date('2026-01-20T00:00:00.000Z'),
      promptTokens: 8,
      completionTokens: 2,
      estimatedCostUsd: 0.2
    })
  )
  meter.record(
    event({
      purpose: 'campaign-create',
      recordedAt: new Date('2026-01-25T00:00:00.000Z'),
      promptTokens: 4,
      completionTokens: 4,
      estimatedCostUsd: 0.05
    })
  )
  return meter
}

function expectedTimeRangeAggregates(): UsagePurposeAggregate[] {
  return [
    {
      purpose: 'campaign-create',
      eventCount: 1,
      promptTokens: 4,
      completionTokens: 4,
      totalTokens: 8,
      estimatedCostUsd: 0.05
    },
    {
      purpose: 'turn-narration',
      eventCount: 1,
      promptTokens: 8,
      completionTokens: 2,
      totalTokens: 10,
      estimatedCostUsd: 0.2
    }
  ]
}
