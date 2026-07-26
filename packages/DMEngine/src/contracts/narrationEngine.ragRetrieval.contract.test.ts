import { describe, expect, it } from 'vitest'
import {
  createRagIndex,
  DEFAULT_RAG_MAX_CHARS,
  type RagChunk
} from '@weaver/narration-engine'
import { assembleAgentContext } from '../context/assembleAgentContext.js'

describe('DMEngine -> NarrationEngine RAG retrieval contract (062)', () => {
  it('indexes and retrieves chunks then assembles context with always-on preserved', async () => {
    const index = createRagIndex()
    const campaignId = 'contract-campaign-062'

    const facts: RagChunk[] = [
      chunk(campaignId, 'vault-lore', 'The sealed vault hides a sun sigil beneath the altar.'),
      chunk(campaignId, 'npc-memory', 'Greta distrusts strangers wearing crimson cloaks.'),
      chunk(
        campaignId,
        'ancient-history',
        `Ancient history ${'scroll '.repeat(120)}`
      )
    ]

    for (const fact of facts) {
      await index.indexCampaignFact(fact)
    }

    const retrieval = await index.retrieveRelevantChunks({
      campaignId,
      query: 'vault sigil altar',
      mode: 'lexical',
      maxChars: DEFAULT_RAG_MAX_CHARS
    })

    expect(retrieval.chunks.length).toBeGreaterThan(0)

    const result = assembleAgentContext({
      alwaysOn: {
        currentHp: 'HP 14/20',
        presentNpcs: 'Greta, Brom',
        activeCombatState: 'exploration'
      },
      ragChunks: retrieval.chunks.map((entry) => ({ id: entry.id, text: entry.text })),
      maxTokens: 80
    })

    expect(result.prompt).toContain('HP 14/20')
    expect(result.prompt).toContain('Greta, Brom')
    expect(result.prompt).toContain('exploration')
    expect(result.tokenCount).toBeLessThanOrEqual(80)
    expect(result.ragIncluded).toBeGreaterThan(0)
  })
})

function chunk(campaignId: string, id: string, text: string): RagChunk {
  return {
    id,
    campaignId,
    category: 'world',
    text
  }
}
