import { createRagIndex } from './ragIndex.js'
import type { RagChunk, RagEmbedder, RetrieveRelevantChunksInput } from './types.js'
import { DEFAULT_RAG_MAX_CHARS, RAG_REINDEX_NOTE } from './types.js'

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

let activeIndex = createRagIndex()

export function getRagIndex() {
  return activeIndex
}

export function resetRagIndex(): void {
  activeIndex = createRagIndex()
}

export function buildRagEndpoints(getIndex = getRagIndex): EngineEndpoint[] {
  return [
    endpoint('indexCampaignFact', 'Index or update a campaign fact chunk for RAG retrieval', async (payload) => {
      const request = readIndexPayload(payload)
      await getIndex().indexCampaignFact(request.chunk, request.options)
      return { ok: true as const, chunkId: request.chunk.id }
    }),
    endpoint('removeCampaignFact', 'Remove a campaign fact chunk from the RAG index', (payload) => {
      const request = readRemovePayload(payload)
      getIndex().removeCampaignFact(request.campaignId, request.chunkId)
      return { ok: true as const }
    }),
    endpoint('retrieveRelevantChunks', 'Retrieve ranked campaign chunks within the hard cap', async (payload) => {
      return await getIndex().retrieveRelevantChunks(readRetrievePayload(payload))
    }),
    endpoint('listRagChunks', 'List indexed chunks for a campaign', (payload) => {
      const campaignId = readCampaignId(payload)
      return { chunks: getIndex().listChunks(campaignId) }
    }),
    endpoint('describeRagRetrieval', 'Document hybrid retrieval and mixed-mode index behavior', () => ({
      defaultMaxChars: DEFAULT_RAG_MAX_CHARS,
      embedderModes: ['lexical', 'local', 'openai', 'gemini'],
      mixedModeNote: RAG_REINDEX_NOTE
    }))
  ]
}

function endpoint(
  name: string,
  description: string,
  invoke: (payload?: unknown) => Promise<unknown> | unknown
): EngineEndpoint {
  return { name, description, invoke }
}

function readIndexPayload(payload: unknown): {
  chunk: RagChunk
  options?: { embedder?: RagEmbedder }
} {
  const record = asRecord(payload, 'indexCampaignFact')
  const chunk = record.chunk
  if (!isRagChunk(chunk)) {
    throw new Error('indexCampaignFact payload requires a RagChunk')
  }
  const embedder = readOptionalEmbedder(record.embedder)
  return embedder === undefined ? { chunk } : { chunk, options: { embedder } }
}

function readRemovePayload(payload: unknown): { campaignId: string; chunkId: string } {
  const record = asRecord(payload, 'removeCampaignFact')
  return {
    campaignId: readString(record, 'campaignId'),
    chunkId: readString(record, 'chunkId')
  }
}

function readRetrievePayload(payload: unknown): RetrieveRelevantChunksInput {
  const record = asRecord(payload, 'retrieveRelevantChunks')
  const mode = readEmbedderMode(record.mode)
  const embedder = readOptionalEmbedder(record.embedder)
  const maxChars = optionalNumber(record.maxChars)
  return {
    campaignId: readString(record, 'campaignId'),
    query: readString(record, 'query'),
    mode,
    ...(embedder === undefined ? {} : { embedder }),
    ...(maxChars === undefined ? {} : { maxChars })
  }
}

function readCampaignId(payload: unknown): string {
  return readString(asRecord(payload, 'listRagChunks'), 'campaignId')
}

function readOptionalEmbedder(value: unknown): RagEmbedder | undefined {
  if (value === undefined) {
    return undefined
  }
  const record = asRecord(value, 'embedder')
  const mode = readCloudMode(record.mode)
  const vectorKey = readString(record, 'vectorKey')
  const vectors = asVectorMap(record.vectors)
  return {
    mode,
    embed: async (text) => vectors[text] ?? vectors[vectorKey] ?? null
  }
}

function asVectorMap(value: unknown): Record<string, number[]> {
  const record = asRecord(value, 'vectors')
  const vectors: Record<string, number[]> = {}
  for (const [key, entry] of Object.entries(record)) {
    if (Array.isArray(entry) && entry.every((item) => typeof item === 'number')) {
      vectors[key] = entry
    }
  }
  return vectors
}

function readEmbedderMode(value: unknown) {
  if (value === 'lexical' || value === 'local' || value === 'openai' || value === 'gemini') {
    return value
  }
  throw new Error('retrieveRelevantChunks payload requires mode lexical|local|openai|gemini')
}

function readCloudMode(value: unknown): RagEmbedder['mode'] {
  if (value === 'local' || value === 'openai' || value === 'gemini') {
    return value
  }
  throw new Error('embedder payload requires mode local|openai|gemini')
}

function isRagChunk(value: unknown): value is RagChunk {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false
  }
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.campaignId === 'string' &&
    isCategory(record.category) &&
    typeof record.text === 'string'
  )
}

function isCategory(value: unknown): boolean {
  return value === 'world' || value === 'npc_memory' || value === 'story_thread' || value === 'event'
}

function asRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`${label} payload must be an object`)
  }
  return payload as Record<string, unknown>
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`payload requires string ${key}`)
  }
  return value
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
