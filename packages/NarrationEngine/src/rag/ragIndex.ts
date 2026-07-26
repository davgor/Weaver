import { scoreLexical } from './lexical.js'
import { cosineSimilarity } from './similarity.js'
import type {
  CampaignFactCategory,
  EmbedderMode,
  IndexCampaignFactOptions,
  RagChunk,
  RagEmbedder,
  RagIndex,
  RetrieveRelevantChunksInput,
  RetrieveRelevantChunksResult
} from './types.js'
import {
  DEFAULT_RAG_MAX_CHARS,
  RAG_REINDEX_NOTE
} from './types.js'

export { DEFAULT_RAG_MAX_CHARS, RAG_REINDEX_NOTE }
export type {
  CampaignFactCategory,
  EmbedderMode,
  IndexCampaignFactOptions,
  RagChunk,
  RagEmbedder,
  RagIndex,
  RetrieveRelevantChunksInput,
  RetrieveRelevantChunksResult
}

type ScoredChunk = {
  chunk: RagChunk
  score: number
}

export function createRagIndex(): RagIndex {
  const byCampaign = new Map<string, Map<string, RagChunk>>()

  return {
    indexCampaignFact: (chunk, options) => indexFact(byCampaign, chunk, options),
    removeCampaignFact: (campaignId, chunkId) => removeFact(byCampaign, campaignId, chunkId),
    retrieveRelevantChunks: (input) => retrieveChunks(byCampaign, input),
    listChunks: (campaignId) => listCampaignChunks(byCampaign, campaignId)
  }
}

async function indexFact(
  store: Map<string, Map<string, RagChunk>>,
  chunk: RagChunk,
  options?: IndexCampaignFactOptions
): Promise<void> {
  const stored = await buildStoredChunk(chunk, options?.embedder)
  campaignMap(store, chunk.campaignId).set(chunk.id, stored)
}

function removeFact(
  store: Map<string, Map<string, RagChunk>>,
  campaignId: string,
  chunkId: string
): void {
  campaignMap(store, campaignId).delete(chunkId)
}

function listCampaignChunks(store: Map<string, Map<string, RagChunk>>, campaignId: string): RagChunk[] {
  return [...campaignMap(store, campaignId).values()]
}

async function retrieveChunks(
  store: Map<string, Map<string, RagChunk>>,
  input: RetrieveRelevantChunksInput
): Promise<RetrieveRelevantChunksResult> {
  const chunks = listCampaignChunks(store, input.campaignId)
  const maxChars = input.maxChars ?? DEFAULT_RAG_MAX_CHARS
  if (chunks.length === 0) {
    return emptyResult(input.mode)
  }

  const ranked = await rankChunks(chunks, input)
  const selected = selectWithinCap(ranked.scored, maxChars)
  return {
    chunks: selected.map((entry) => entry.chunk),
    totalChars: selected.reduce((sum, entry) => sum + entry.chunk.text.length, 0),
    retrievalMode: ranked.retrievalMode,
    usedLexicalFallback: ranked.usedLexicalFallback
  }
}

async function buildStoredChunk(chunk: RagChunk, embedder?: RagEmbedder): Promise<RagChunk> {
  if (chunk.embedding !== undefined) {
    return { ...chunk, updatedAt: chunk.updatedAt ?? Date.now() }
  }
  if (embedder === undefined) {
    return { ...chunk, updatedAt: chunk.updatedAt ?? Date.now() }
  }

  const embedding = await embedder.embed(chunk.text)
  if (embedding === null) {
    return { ...chunk, updatedAt: chunk.updatedAt ?? Date.now() }
  }
  return {
    ...chunk,
    embedding,
    embeddingMode: embedder.mode,
    updatedAt: chunk.updatedAt ?? Date.now()
  }
}

async function rankChunks(
  chunks: RagChunk[],
  input: RetrieveRelevantChunksInput
): Promise<{ scored: ScoredChunk[]; retrievalMode: EmbedderMode | 'lexical-fallback'; usedLexicalFallback: boolean }> {
  if (input.mode === 'lexical') {
    return lexicalRank(chunks, input.query, 'lexical', false)
  }

  const queryVector = await safeEmbed(input.embedder, input.query)
  if (queryVector === null) {
    return lexicalRank(chunks, input.query, 'lexical-fallback', true)
  }

  const mode = input.mode as Exclude<EmbedderMode, 'lexical'>
  const scored = chunks
    .map((entry) => ({
      chunk: entry,
      score: scoreChunk(entry, input.query, queryVector, mode)
    }))
    .filter((entry) => entry.score > 0)
  scored.sort(byScoreDesc)
  return { scored, retrievalMode: mode, usedLexicalFallback: false }
}

function lexicalRank(
  chunks: RagChunk[],
  query: string,
  retrievalMode: EmbedderMode | 'lexical-fallback',
  usedLexicalFallback: boolean
) {
  const scored = chunks
    .map((entry) => ({
      chunk: entry,
      score: scoreLexical(query, entry.text)
    }))
    .filter((entry) => entry.score > 0)
  scored.sort(byScoreDesc)
  return { scored, retrievalMode, usedLexicalFallback }
}

function scoreChunk(
  chunk: RagChunk,
  query: string,
  queryVector: number[],
  mode: Exclude<EmbedderMode, 'lexical'>
): number {
  if (chunk.embedding !== undefined && (chunk.embeddingMode === undefined || chunk.embeddingMode === mode)) {
    return cosineSimilarity(queryVector, chunk.embedding)
  }
  return scoreLexical(query, chunk.text) * 0.25
}

async function safeEmbed(embedder: RagEmbedder | undefined, text: string): Promise<number[] | null> {
  if (embedder === undefined) {
    return null
  }
  try {
    return await embedder.embed(text)
  } catch {
    return null
  }
}

function selectWithinCap(scored: ScoredChunk[], maxChars: number): ScoredChunk[] {
  const selected: ScoredChunk[] = []
  let totalChars = 0
  for (const entry of scored) {
    const nextTotal = totalChars + entry.chunk.text.length
    if (nextTotal <= maxChars) {
      selected.push(entry)
      totalChars = nextTotal
      continue
    }
    if (selected.length === 0 && entry.chunk.text.length > maxChars) {
      selected.push({
        chunk: { ...entry.chunk, text: entry.chunk.text.slice(0, maxChars) },
        score: entry.score
      })
      break
    }
  }
  return selected
}

function byScoreDesc(left: ScoredChunk, right: ScoredChunk): number {
  return right.score - left.score
}

function campaignMap(store: Map<string, Map<string, RagChunk>>, campaignId: string): Map<string, RagChunk> {
  const existing = store.get(campaignId)
  if (existing !== undefined) {
    return existing
  }
  const created = new Map<string, RagChunk>()
  store.set(campaignId, created)
  return created
}

function emptyResult(mode: EmbedderMode): RetrieveRelevantChunksResult {
  return {
    chunks: [],
    totalChars: 0,
    retrievalMode: mode === 'lexical' ? 'lexical' : 'lexical-fallback',
    usedLexicalFallback: mode !== 'lexical'
  }
}
