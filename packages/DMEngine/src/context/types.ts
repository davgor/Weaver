export type AlwaysOnGrounding = {
  currentHp?: string
  presentNpcs?: string
  activeCombatState?: string
}

export type RagContextChunk = {
  id: string
  text: string
}

export type AssembleAgentContextInput = {
  alwaysOn: AlwaysOnGrounding
  ragChunks: RagContextChunk[]
  extras?: string[]
  maxTokens: number
  hardFailOnBudgetExceeded?: boolean
}

export type AssembleAgentContextResult = {
  prompt: string
  tokenCount: number
  truncated: boolean
  ragIncluded: number
}
