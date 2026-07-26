export type EmbedderMode = 'lexical' | 'local' | 'openai' | 'gemini'

export type CampaignFactCategory = 'world' | 'npc_memory' | 'story_thread' | 'event'

export type RagChunk = {
  id: string
  campaignId: string
  category: CampaignFactCategory
  text: string
  embedding?: number[]
  embeddingMode?: Exclude<EmbedderMode, 'lexical'>
  updatedAt?: number
}

export type RagEmbedder = {
  mode: Exclude<EmbedderMode, 'lexical'>
  embed: (text: string) => Promise<number[] | null>
}

export type RetrieveRelevantChunksInput = {
  campaignId: string
  query: string
  mode: EmbedderMode
  embedder?: RagEmbedder
  maxChars?: number
}

export type RetrieveRelevantChunksResult = {
  chunks: RagChunk[]
  totalChars: number
  retrievalMode: EmbedderMode | 'lexical-fallback'
  usedLexicalFallback: boolean
}

export type RagIndex = {
  indexCampaignFact: (chunk: RagChunk, options?: IndexCampaignFactOptions) => Promise<void>
  removeCampaignFact: (campaignId: string, chunkId: string) => void
  retrieveRelevantChunks: (
    input: RetrieveRelevantChunksInput
  ) => Promise<RetrieveRelevantChunksResult>
  listChunks: (campaignId: string) => RagChunk[]
}

export type IndexCampaignFactOptions = {
  embedder?: RagEmbedder
}

export const DEFAULT_RAG_MAX_CHARS = 2000

export const RAG_REINDEX_NOTE =
  'Switching embedder modes does not require a schema migration. Chunks indexed under a different ' +
  'embedding mode remain searchable via lexical fallback; re-index with the active embedder for ' +
  'best semantic ranking.'
