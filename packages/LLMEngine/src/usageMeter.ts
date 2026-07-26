import type {
  UsageEvent,
  UsageEventInput,
  UsageMeter,
  UsagePurposeAggregate,
  UsageTimeRange
} from './usageTypes.js'

export function createUsageMeter(): UsageMeter {
  const events: UsageEvent[] = []
  let nextId = 1

  return {
    record(input) {
      const event = toEvent(input, String(nextId))
      nextId += 1
      events.push(event)
      return event
    },
    listEvents(range) {
      return eventsInRange(events, range).map(cloneEvent)
    },
    aggregateByPurpose(range) {
      return aggregateEvents(eventsInRange(events, range))
    },
    clear() {
      events.length = 0
    }
  }
}

/** Process-wide default meter used when callers do not inject one. */
export const sharedUsageMeter: UsageMeter = createUsageMeter()

function toEvent(input: UsageEventInput, id: string): UsageEvent {
  const promptTokens = nonNegativeInt(input.promptTokens)
  const completionTokens = nonNegativeInt(input.completionTokens)
  return {
    id,
    provider: input.provider,
    model: input.model,
    purpose: input.purpose,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd: nonNegativeNumber(input.estimatedCostUsd),
    recordedAt: input.recordedAt ?? new Date()
  }
}

function eventsInRange(events: UsageEvent[], range: UsageTimeRange | undefined): UsageEvent[] {
  if (!range) return events
  return events.filter((event) => inRange(event.recordedAt, range))
}

function inRange(at: Date, range: UsageTimeRange): boolean {
  if (range.from && at < range.from) return false
  if (range.to && at > range.to) return false
  return true
}

function aggregateEvents(events: UsageEvent[]): UsagePurposeAggregate[] {
  const byPurpose = new Map<string, UsagePurposeAggregate>()
  for (const event of events) {
    const current = byPurpose.get(event.purpose) ?? emptyAggregate(event.purpose)
    byPurpose.set(event.purpose, addEvent(current, event))
  }
  return [...byPurpose.values()].sort((a, b) => a.purpose.localeCompare(b.purpose))
}

function emptyAggregate(purpose: string): UsagePurposeAggregate {
  return {
    purpose,
    eventCount: 0,
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
    estimatedCostUsd: 0
  }
}

function addEvent(current: UsagePurposeAggregate, event: UsageEvent): UsagePurposeAggregate {
  return {
    purpose: current.purpose,
    eventCount: current.eventCount + 1,
    promptTokens: current.promptTokens + event.promptTokens,
    completionTokens: current.completionTokens + event.completionTokens,
    totalTokens: current.totalTokens + event.totalTokens,
    estimatedCostUsd: roundCost(current.estimatedCostUsd + event.estimatedCostUsd)
  }
}

function cloneEvent(event: UsageEvent): UsageEvent {
  return { ...event, recordedAt: new Date(event.recordedAt.getTime()) }
}

function nonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.floor(value)
}

function nonNegativeNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function roundCost(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000
}
