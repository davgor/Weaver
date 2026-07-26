export type SocialSpeakerKind = 'player' | 'npc'

export type SocialLine = {
  id: string
  kind: SocialSpeakerKind
  speakerId: string
  text: string
  at: number
}

export type SceneBlock = {
  id: string
  text: string
  at: number
}

export type FactualClaim =
  | { kind: 'npcPresent'; npcId: string }
  | { kind: 'itemExists'; itemId: string }
  | { kind: 'locationName'; name: string }

export type ClaimValidationResult = {
  ok: boolean
  accepted: FactualClaim[]
  rejected: Array<FactualClaim & { reason: string }>
}

export type TurnInterestInput = {
  stakes: 'low' | 'high'
  hasDialogue: boolean
  worldChanged: boolean
  combatOccurred: boolean
  noteworthyEventCount: number
}

export type SilentResolveDecision = {
  silent: boolean
  reason: 'nothing_interesting' | 'needs_narration'
}

export type PersistOutcome =
  | { status: 'persisted'; prose: string; claims: FactualClaim[] }
  | { status: 'rejected'; prose: string; validation: ClaimValidationResult }
  | { status: 'silent' }

export type SocialStreamEvent =
  | { type: 'chunk'; text: string; done: boolean }
  | { type: 'line'; line: SocialLine }
  | { type: 'silent' }
  | { type: 'rejected'; validation: ClaimValidationResult }

export type SceneGenerateInput = {
  prompt: string
  context?: string
  maxTokens?: number
}

export type SocialGenerateInput = {
  prompt: string
  speakerId: string
  kind: SocialSpeakerKind
  context?: string
  maxTokens?: number
  interest?: TurnInterestInput
}
