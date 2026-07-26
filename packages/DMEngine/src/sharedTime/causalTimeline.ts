import type { AppendCausalEventInput, CausalEvent } from './types.js'
import { sortEventsByCausalOrder } from './turnOrderPolicy.js'

type CausalTimelineStore = {
  eventsByCampaign: Map<string, CausalEvent[]>
  nextSeqByCampaign: Map<string, number>
  nextEventId: number
}

const store: CausalTimelineStore = {
  eventsByCampaign: new Map(),
  nextSeqByCampaign: new Map(),
  nextEventId: 1
}

export function appendCausalEvent(input: AppendCausalEventInput): CausalEvent {
  const seq = (store.nextSeqByCampaign.get(input.campaignId) ?? 0) + 1
  store.nextSeqByCampaign.set(input.campaignId, seq)

  const event: CausalEvent = {
    id: `evt-${store.nextEventId++}`,
    campaignId: input.campaignId,
    actorCharacterId: input.actorCharacterId,
    kind: input.kind,
    summary: input.summary,
    day: input.day,
    seq,
    at: input.at
  }

  const events = store.eventsByCampaign.get(input.campaignId) ?? []
  events.push(event)
  store.eventsByCampaign.set(input.campaignId, events)
  return { ...event }
}

export function listCausalEvents(campaignId: string): CausalEvent[] {
  const events = store.eventsByCampaign.get(campaignId) ?? []
  return sortEventsByCausalOrder(events.map(cloneEvent))
}

export function listEventsSince(campaignId: string, sinceAt: number): CausalEvent[] {
  return listCausalEvents(campaignId).filter((event) => event.at > sinceAt)
}

export function exportCausalTimelineStore(): {
  events: CausalEvent[]
  nextSeqByCampaign: Record<string, number>
  nextEventId: number
} {
  const events: CausalEvent[] = []
  for (const campaignEvents of store.eventsByCampaign.values()) {
    events.push(...campaignEvents.map(cloneEvent))
  }
  return {
    events,
    nextSeqByCampaign: Object.fromEntries(store.nextSeqByCampaign),
    nextEventId: store.nextEventId
  }
}

export function importCausalTimelineStore(snapshot: {
  events: readonly CausalEvent[]
  nextSeqByCampaign: Record<string, number>
  nextEventId: number
}): CausalEvent[] {
  resetCausalTimelineStore()
  store.nextEventId = snapshot.nextEventId
  for (const [campaignId, seq] of Object.entries(snapshot.nextSeqByCampaign)) {
    store.nextSeqByCampaign.set(campaignId, seq)
  }
  for (const event of snapshot.events) {
    const events = store.eventsByCampaign.get(event.campaignId) ?? []
    events.push(cloneEvent(event))
    store.eventsByCampaign.set(event.campaignId, events)
  }
  return listCausalEventsFromAllCampaigns()
}

export function resetCausalTimelineStore(): void {
  store.eventsByCampaign.clear()
  store.nextSeqByCampaign.clear()
  store.nextEventId = 1
}

function listCausalEventsFromAllCampaigns(): CausalEvent[] {
  const events: CausalEvent[] = []
  for (const campaignId of store.eventsByCampaign.keys()) {
    events.push(...listCausalEvents(campaignId))
  }
  return events
}

function cloneEvent(event: CausalEvent): CausalEvent {
  return { ...event }
}
