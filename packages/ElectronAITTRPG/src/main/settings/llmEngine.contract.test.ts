import { describe, expect, it } from 'vitest'
import {
  createLlmEngine,
  createTextCompletionClient,
  resolveProviderConfig,
  type ProviderId
} from '@weaver/llm-engine'
import { buildDefaultSettingsSnapshot } from '../../shared/settings/types.js'
import { snapshotToProviderSettings } from './providerSettings.js'

describe('settings LLMEngine contract (067)', () => {
  it('maps settings into ProviderSettings consumed by createTextCompletionClient', providerSettingsContract)
  it('uses LLMEngine status APIs for local connection health checks', localStatusContract)
  it('installs the pinned model through LLMEngine install with progress', localInstallContract)
})

async function providerSettingsContract(): Promise<void> {
  const settings = snapshotToProviderSettings(openAiSnapshot())
  expect(resolveProviderConfig(settings)).toMatchObject({
    provider: 'openai',
    model: 'gpt-4o-mini',
    baseUrl: 'https://example.test/v1'
  })

  const client = createTextCompletionClient({
    settings,
    fetch: async () => response({ choices: [{ message: { content: 'contract ok' } }] }),
    retry: { maxAttempts: 1 }
  })
  await expect(client.completeText({ prompt: 'ping', maxTokens: 4 })).resolves.toMatchObject({
    text: 'contract ok',
    backend: 'openai'
  })
}

async function localStatusContract(): Promise<void> {
  const engine = createContractEngine(new Set<string>())
  expect(engine.health().ok).toBe(true)
  expect(providerIds).toContain('player2')
  await expect(engine.resolveBackend()).resolves.toBe('cpu')
  await expect(engine.getStatus()).resolves.toMatchObject({ phase: 'not_installed' })
}

async function localInstallContract(): Promise<void> {
  const existing = new Set<string>()
  const engine = createContractEngine(existing)
  const progress: Array<{ fraction: number | null }> = []

  await expect(engine.getStatus()).resolves.toMatchObject({ phase: 'not_installed' })
  const status = await engine.install((event) => progress.push(event))
  expect(progress).toHaveLength(1)
  expect(status).toMatchObject({ phase: 'ready', backend: 'cpu' })
}

function createContractEngine(existing: Set<string>) {
  return createLlmEngine({
    dataDir: '/tmp/weaver-contract',
    files: {
      exists: (path) => existing.has(path),
      ensureDir: () => undefined,
      join: (...parts) => parts.join('/')
    },
    downloader: {
      download: async (_url, destPath, onProgress) => {
        onProgress({ phase: 'installing', bytesDownloaded: 100, bytesTotal: 200, fraction: 0.5 })
        existing.add(destPath)
      }
    },
    probe: {
      supportsVulkan: async () => false
    },
    createRuntime: async () => ({
      completeText: async () => ({ text: 'ok', backend: 'cpu' }),
      dispose: async () => undefined
    })
  })
}

function openAiSnapshot() {
  const defaults = buildDefaultSettingsSnapshot()
  return {
    ...defaults,
    text: {
      ...defaults.text,
      provider: 'openai' as const,
      credentials: {
        ...defaults.text.credentials,
        openai: { apiKey: 'contract-key', baseUrl: 'https://example.test/v1/' }
      }
    }
  }
}

function response(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
}

const providerIds: ProviderId[] = ['claude', 'openai', 'gemini', 'grok', 'player2', 'local']
