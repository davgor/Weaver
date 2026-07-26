import { describe, expect, it, vi } from 'vitest'
import {
  createLlmEngine,
  createTextCompletionClient,
  type CreateRuntime,
  type FileStore,
  type ProviderFetch,
  type TextRequest
} from '@weaver/llm-engine'
import { generateScene } from '../index.js'
import type { NarrationPeers } from '../peers.js'

describe('NarrationEngine -> LLMEngine completeText contract', () => {
  it('pins createTextCompletionClient prompt/context and text/backend', async () => {
    const { client, captured } = clientCapturingClaude()
    const peers: NarrationPeers = {
      llm: client,
      npcs: { getNpc: (npcId) => (npcId === 'npc-guard' ? { npcId } : undefined) }
    }

    const outcome = await generateScene(
      { prompt: 'Describe the guard.', context: 'Known NPCs: npc-guard', maxTokens: 32 },
      peers
    )

    expect(outcome.status).toBe('persisted')
    expect(captured[0]).toEqual({
      prompt: 'Describe the guard.',
      context: 'Known NPCs: npc-guard',
      maxTokens: 32
    })

    const ping = await client.completeText({ prompt: 'ping' })
    expect(Object.keys(ping).sort()).toEqual(['backend', 'text'])
    expect(ping.backend).toBe('claude')
  })

  it('uses createLlmEngine installed-gate before inventing prose', async () => {
    const createRuntime = vi.fn<CreateRuntime>()
    const engine = createLlmEngine({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => true },
      createRuntime
    })

    await expect(
      generateScene(
        { prompt: 'Invent a scene.' },
        { llm: engine, npcs: { getNpc: () => undefined } }
      )
    ).rejects.toThrow(/not installed/i)
    expect(createRuntime).not.toHaveBeenCalled()
  })
})

function clientCapturingClaude() {
  const captured: TextRequest[] = []
  const fetch: ProviderFetch = async (_url, init) => {
    captured.push(readClaudeBody(init.body))
    return jsonResponse({
      content: [{ type: 'text', text: 'Validated line.\n<<<CLAIMS\nnpcPresent:npc-guard\n>>>' }]
    })
  }
  const client = createTextCompletionClient({
    settings: { provider: 'claude', claude: { apiKey: 'test-key', model: 'claude-test' } },
    fetch,
    retry: { maxAttempts: 1 }
  })
  return { client, captured }
}

function readClaudeBody(body: BodyInit | null | undefined): TextRequest {
  const parsed = JSON.parse(String(body)) as {
    system?: string
    messages: Array<{ content: string }>
    max_tokens?: number
  }
  return {
    prompt: parsed.messages[0]?.content ?? '',
    ...(parsed.system === undefined ? {} : { context: parsed.system }),
    ...(parsed.max_tokens === undefined ? {} : { maxTokens: parsed.max_tokens })
  }
}

function memoryFiles(existing = new Set<string>()): FileStore {
  return {
    exists: (path) => existing.has(path),
    ensureDir: () => undefined,
    join: (...parts) => parts.join('/')
  }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}
