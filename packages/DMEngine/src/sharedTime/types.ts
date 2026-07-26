export type CausalEvent = {
  id: string
  campaignId: string
  actorCharacterId: string
  kind: string
  summary: string
  day: number
  seq: number
  at: number
}

export type AppendCausalEventInput = {
  campaignId: string
  actorCharacterId: string
  kind: string
  summary: string
  day: number
  at: number
}

export type CharacterSessionCursor = {
  campaignId: string
  characterId: string
  lastSessionAt: number
}

export type SessionRecapInput = {
  events: readonly CausalEvent[]
  lastSessionAt: number
  characterId: string
}

export type SessionRecap = {
  paragraphs: string[]
  eventIds: string[]
}

export type CharacterDayCounterApi = {
  getCampaignDay: (campaignId: string) => number
}
