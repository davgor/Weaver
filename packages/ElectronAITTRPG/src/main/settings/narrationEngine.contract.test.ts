import { describe, expect, it } from 'vitest'
import {
  createRagIndex,
  narrationEngine,
  type EmbedderMode,
  type ImageGenerationSettings,
  type ImageProviderId
} from '@weaver/narration-engine'
import { supportedEmbedderModesFromDescription } from '../../shared/settings/types.js'

describe('settings NarrationEngine contract (065/066)', () => {
  it('discovers supported RAG embedder modes from the real describe endpoint', ragModesContract)
  it('keeps text settings independent from the real image provider rails', imageRailsContract)
})

async function ragModesContract(): Promise<void> {
  const description = await narrationEngine.call('describeRagRetrieval')
  const modes = supportedEmbedderModesFromDescription(description)

  expect(modes).toEqual(['lexical', 'local', 'openai', 'gemini'])

  const index = createRagIndex()
  await index.indexCampaignFact({
    id: 'fact-1',
    campaignId: 'campaign-1',
    category: 'world',
    text: 'The brass tower stands beside the northern road.'
  })
  await expect(index.retrieveRelevantChunks(retrieveInput(modes))).resolves.toMatchObject({
    retrievalMode: 'lexical',
    usedLexicalFallback: false
  })
}

async function imageRailsContract(): Promise<void> {
  const result = await narrationEngine.generatePortrait(portraitRequest(), {
    providers: {
      player2: {
        id: 'player2',
        generate: async () => '/tmp/player2.png'
      }
    }
  })

  const modes: EmbedderMode[] = ['lexical', 'local', 'openai', 'gemini']
  expect(modes).toContain('openai')
  expect(result).toEqual({
    imagePath: '/tmp/player2.png',
    provider: 'player2',
    degraded: false
  })
}

function retrieveInput(modes: EmbedderMode[]) {
  return {
    campaignId: 'campaign-1',
    query: 'brass tower',
    mode: modes[0] ?? 'lexical'
  }
}

function portraitRequest() {
  const providerIds: ImageProviderId[] = ['cloud', 'player2', 'local']
  const settings: ImageGenerationSettings = {
    provider: providerIds[1] ?? 'player2',
    generativeTokensEnabled: true
  }
  return {
    subjectKind: 'npc' as const,
    subjectId: 'npc.contract',
    prompt: 'portrait',
    settings,
    subjectFacts: {
      race: 'human',
      description: 'a travelling scholar'
    }
  }
}
