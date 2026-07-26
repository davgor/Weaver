import { describe, expect, it } from 'vitest'
import { scoreLexical } from './lexical.js'
import { createRagIndex } from './ragIndex.js'
import type { RagChunk, RagEmbedder } from './types.js'
import { DEFAULT_RAG_MAX_CHARS, RAG_REINDEX_NOTE } from './types.js'

const CAMPAIGN = 'campaign-alpha'

function chunk(
  id: string,
  text: string,
  extras: Partial<RagChunk> = {}
): RagChunk {
  return {
    id,
    campaignId: CAMPAIGN,
    category: 'world',
    text,
    ...extras
  }
}

function fakeEmbedder(
  mode: RagEmbedder['mode'],
  vectors: Record<string, number[]>
): RagEmbedder {
  return {
    mode,
    embed: async (text) => vectors[text] ?? null
  }
}

describe('lexical scoring', () => {
  it('ranks chunks that share query terms', () => {
    expect(scoreLexical('ancient dragon lair', 'The ancient dragon sleeps in its lair')).toBeGreaterThan(
      scoreLexical('ancient dragon lair', 'A quiet village square')
    )
  })
})

describe('createRagIndex indexing', () => {
  it('indexes and removes campaign facts for a campaign', async () => {
    const index = createRagIndex()
    await index.indexCampaignFact(chunk('fact-1', 'The moon temple glows at dusk'))
    await index.indexCampaignFact(chunk('fact-2', 'Captain Mira distrusts strangers'))

    expect(index.listChunks(CAMPAIGN).map((entry) => entry.id)).toEqual(['fact-1', 'fact-2'])

    index.removeCampaignFact(CAMPAIGN, 'fact-1')
    expect(index.listChunks(CAMPAIGN).map((entry) => entry.id)).toEqual(['fact-2'])
  })

  it('updates an existing chunk when the same id is indexed again', async () => {
    const index = createRagIndex()
    await index.indexCampaignFact(chunk('fact-1', 'Old lore'))
    await index.indexCampaignFact(chunk('fact-1', 'Updated lore about the moon temple'))

    const stored = index.listChunks(CAMPAIGN)
    expect(stored).toHaveLength(1)
    expect(stored[0]?.text).toBe('Updated lore about the moon temple')
  })
})

describe('createRagIndex lexical retrieval', () => {
  it('retrieves lexically relevant chunks without an embedder', async () => {
    const index = createRagIndex()
    await index.indexCampaignFact(chunk('a', 'The moon temple rests above the silver lake'))
    await index.indexCampaignFact(chunk('b', 'Farmers trade grain in Riverford market'))
    await index.indexCampaignFact(chunk('c', 'A hidden shrine honors the moon goddess'))

    const result = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'moon temple goddess',
      mode: 'lexical'
    })

    expect(result.usedLexicalFallback).toBe(false)
    expect(result.retrievalMode).toBe('lexical')
    expect(result.chunks.map((entry) => entry.id)).toEqual(['a', 'c'])
  })

  it('never throws when retrieval is asked for an empty campaign', async () => {
    const index = createRagIndex()
    await expect(
      index.retrieveRelevantChunks({
        campaignId: 'missing-campaign',
        query: 'anything',
        mode: 'gemini'
      })
    ).resolves.toEqual({
      chunks: [],
      totalChars: 0,
      retrievalMode: 'lexical-fallback',
      usedLexicalFallback: true
    })
  })
})

describe('createRagIndex embedding retrieval', () => {
  it('ranks with embeddings when mode and embedder are available', async () => {
    const index = createRagIndex()
    const embedder = fakeEmbedder('local', {
      'moon temple': [1, 0, 0],
      'The moon temple glows at dusk': [0.95, 0.05, 0],
      'Riverford grain market': [0, 1, 0]
    })

    await index.indexCampaignFact(chunk('a', 'The moon temple glows at dusk'), { embedder })
    await index.indexCampaignFact(chunk('b', 'Riverford grain market'), { embedder })

    const result = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'moon temple',
      mode: 'local',
      embedder
    })

    expect(result.usedLexicalFallback).toBe(false)
    expect(result.retrievalMode).toBe('local')
    expect(result.chunks[0]?.id).toBe('a')
  })
})

describe('createRagIndex embedding fallback', () => {
  it('falls back to lexical search when embeddings are missing or fail', async () => {
    const index = createRagIndex()
    await index.indexCampaignFact(chunk('a', 'Moon temple above the lake'))
    await index.indexCampaignFact(chunk('b', 'Unrelated caravan route'))

    const missing = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'moon temple',
      mode: 'openai'
    })
    expect(missing.usedLexicalFallback).toBe(true)
    expect(missing.retrievalMode).toBe('lexical-fallback')
    expect(missing.chunks[0]?.id).toBe('a')

    const failing = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'moon temple',
      mode: 'local',
      embedder: {
        mode: 'local',
        embed: async () => null
      }
    })
    expect(failing.usedLexicalFallback).toBe(true)
    expect(failing.chunks[0]?.id).toBe('a')
  })
})

describe('createRagIndex mixed-mode index', () => {
  it('tolerates mixed-mode embeddings without requiring migration', async () => {
    const index = createRagIndex()
    const openai = fakeEmbedder('openai', {
      'moon temple': [0, 1],
      'cloud moon archive': [0.1, 0.9]
    })

    await index.indexCampaignFact(
      chunk('local', 'local moon shrine', {
        embedding: [0.9, 0.1],
        embeddingMode: 'local'
      })
    )
    await index.indexCampaignFact(
      chunk('cloud', 'cloud moon archive', {
        embedding: [0.1, 0.9],
        embeddingMode: 'openai'
      })
    )
    await index.indexCampaignFact(chunk('lex', 'lexical moon temple notes'))

    const result = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'moon temple',
      mode: 'openai',
      embedder: openai
    })

    expect(result.chunks.map((entry) => entry.id)).toContain('cloud')
    expect(result.chunks.map((entry) => entry.id)).toContain('lex')
    expect(RAG_REINDEX_NOTE).toMatch(/re-index/i)
  })
})

describe('createRagIndex cap enforcement', () => {
  it('enforces the hard character cap independent of caller budgets', async () => {
    const index = createRagIndex()
    await index.indexCampaignFact(chunk('a', 'alpha '.repeat(300)))
    await index.indexCampaignFact(chunk('b', 'bravo '.repeat(300)))
    await index.indexCampaignFact(chunk('c', 'charlie '.repeat(300)))

    const result = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'alpha bravo charlie',
      mode: 'lexical',
      maxChars: 1500
    })

    expect(result.totalChars).toBeLessThanOrEqual(1500)
    expect(result.chunks.length).toBe(1)
  })

  it('defaults to the package hard cap', async () => {
    const index = createRagIndex()
    await index.indexCampaignFact(chunk('a', 'x'.repeat(DEFAULT_RAG_MAX_CHARS + 100)))

    const result = await index.retrieveRelevantChunks({
      campaignId: CAMPAIGN,
      query: 'x',
      mode: 'lexical'
    })

    expect(result.totalChars).toBeLessThanOrEqual(DEFAULT_RAG_MAX_CHARS)
  })
})
