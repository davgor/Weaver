export type TextCompletionRequest = {
  prompt: string
  context?: string
  maxTokens?: number
}

export type TextCompletionResponse = {
  text: string
  backend: string
}

export type TextCompleter = {
  completeText: (request: TextCompletionRequest) => Promise<TextCompletionResponse>
}

export type NpcPresenceRecord = {
  npcId: string
  displayName?: string
}

export type NpcPresenceLookup = {
  getNpc: (npcId: string) => NpcPresenceRecord | undefined
}

export type ItemPresenceLookup = {
  hasItem: (itemId: string) => boolean
}

export type LocationLookup = {
  isKnownLocation: (name: string) => boolean
}

export type NarrationPeers = {
  llm: TextCompleter
  npcs: NpcPresenceLookup
  items?: ItemPresenceLookup
  locations?: LocationLookup
}
