import { describe, expect, it } from 'vitest'
import {
  buildPortraitPrompt,
  createCloudImageProvider,
  createLocalImageProvider,
  createPlayer2ImageProvider,
  generatePortrait,
  narrationEngine,
  setManualPortrait,
  validatePortraitSubject,
  type ImageFetch,
  type ImageGenerateRequest,
  type ImageProvider,
  type ImageProviderId,
  type PortraitSubjectKind
} from './index.js'

describe('@weaver/narration-engine', () => {
  it('reports healthy', () => {
    const health = narrationEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/narration-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = narrationEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await narrationEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/narration-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await narrationEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/narration-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(narrationEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })

  it('describes prose and visual token responsibilities', async () => {
    const role = await narrationEngine.call('describeRole')
    expect(role).toMatchObject({
      inventsStories: true,
      inventsVisualTokens: true,
      visualTokenSubjects: ['npc', 'enemy', 'companion', 'pc']
    })
  })

  it('lists portrait and manual icon endpoints', () => {
    const endpointNames = narrationEngine.listEndpoints().map((endpoint) => endpoint.name)
    expect(endpointNames).toEqual(
      expect.arrayContaining(['generatePortrait', 'setManualPortrait', 'describeRole'])
    )
  })
})

describe('portrait generation gating', () => {
  it('does not call a provider when campaign generative tokens are disabled', async () => {
    const calls: string[] = []
    const result = await generatePortrait(sampleRequest('npc', 'cloud', false), {
      providers: {
        cloud: provider('cloud', async (prompt) => {
          calls.push(prompt)
          return '/portraits/npc.png'
        })
      }
    })

    expect(result).toEqual({ imagePath: null, provider: 'cloud', degraded: true })
    expect(calls).toEqual([])
  })
})

describe('portrait generation shared provider path', () => {
  it('routes every subject kind through one provider interface with fact-grounded prompts', async () => {
    const subjects: PortraitSubjectKind[] = ['npc', 'enemy', 'companion', 'pc']
    const prompts: string[] = []
    const results = await Promise.all(
      subjects.map((subjectKind) =>
        generatePortrait(sampleRequest(subjectKind, 'local', true), {
          providers: {
            local: provider('local', async (prompt) => {
              prompts.push(prompt)
              return `/portraits/${subjectKind}.png`
            })
          }
        })
      )
    )

    expect(results.map((result) => result.degraded)).toEqual([false, false, false, false])
    expect(prompts).toHaveLength(subjects.length)
    for (const prompt of prompts) {
      expect(prompt).toContain('Race: elf')
      expect(prompt).toContain('Description: silver-haired scout')
      expect(prompt).toContain('Base prompt: heroic face token')
    }
  })
})

describe('portrait generation degradation', () => {
  it('degrades to no portrait when provider generation fails', async () => {
    const result = await generatePortrait(sampleRequest('enemy', 'player2', true), {
      providers: {
        player2: provider('player2', async () => {
          throw new Error('provider unavailable')
        })
      }
    })

    expect(result).toEqual({ imagePath: null, provider: 'player2', degraded: true })
  })

  it('rejects empty contradictory subject facts before calling providers', async () => {
    const request = {
      ...sampleRequest('companion', 'local', true),
      subjectFacts: { race: '', description: '' }
    }
    const validation = validatePortraitSubject(request)
    const result = await generatePortrait(request, {
      providers: {
        local: provider('local', async () => '/portraits/companion.png')
      }
    })

    expect(validation.ok).toBe(false)
    expect(result).toEqual({ imagePath: null, provider: 'local', degraded: true })
  })

  it('builds prompts from subject facts without mutating the request prompt', () => {
    const request = sampleRequest('pc', 'cloud', true)
    const prompt = buildPortraitPrompt(request)

    expect(prompt).toContain('Subject kind: pc')
    expect(prompt).toContain('Subject id: pc-1')
    expect(prompt).toContain('Race: elf')
    expect(prompt).toContain('Description: silver-haired scout')
    expect(request.prompt).toBe('heroic face token')
  })
})

describe('image providers', () => {
  it('adapts cloud and Player2 providers through injected fetch functions', async () => {
    const calls: string[] = []
    const fetch: ImageFetch = async (url) => {
      calls.push(url)
      return jsonResponse({ imagePath: `/generated/${calls.length}.png` })
    }

    const cloud = createCloudImageProvider({ endpoint: 'https://cloud.example/generate', fetch })
    const player2 = createPlayer2ImageProvider({
      endpoint: 'https://player2.example/generate',
      fetch
    })

    await expect(cloud.generate(providerRequest('cloud'))).resolves.toBe('/generated/1.png')
    await expect(player2.generate(providerRequest('player2'))).resolves.toBe('/generated/2.png')
    expect(calls).toEqual(['https://cloud.example/generate', 'https://player2.example/generate'])
  })

  it('adapts local providers through an injected runtime', async () => {
    const local = createLocalImageProvider({
      runtime: {
        generateImage: async (request) => `/local/${request.subjectKind}-${request.subjectId}.png`
      }
    })

    await expect(local.generate(providerRequest('local'))).resolves.toBe('/local/pc-pc-1.png')
  })
})

describe('manual portraits', () => {
  it('supports upload/replace manual PC portrait paths without generation', async () => {
    const saved: string[] = []
    const store = {
      saveManualPortrait: async (characterId: string, imagePath: string) => {
        saved.push(`${characterId}:${imagePath}`)
      }
    }

    const first = await setManualPortrait('pc-1', '/uploads/old.png', { store })
    const replacement = await setManualPortrait('pc-1', '/uploads/new.png', { store })

    expect(first).toEqual({ characterId: 'pc-1', imagePath: '/uploads/old.png' })
    expect(replacement).toEqual({ characterId: 'pc-1', imagePath: '/uploads/new.png' })
    expect(saved).toEqual(['pc-1:/uploads/old.png', 'pc-1:/uploads/new.png'])
  })
})

function sampleRequest(
  subjectKind: PortraitSubjectKind,
  providerId: ImageProviderId,
  generativeTokensEnabled: boolean
): ImageGenerateRequest {
  return {
    subjectKind,
    subjectId: subjectKind === 'pc' ? 'pc-1' : `${subjectKind}-1`,
    prompt: 'heroic face token',
    campaignId: 'campaign-1',
    settings: { provider: providerId, generativeTokensEnabled },
    subjectFacts: { race: 'elf', description: 'silver-haired scout' }
  }
}

function provider(id: ImageProviderId, generatePrompt: (prompt: string) => Promise<string>): ImageProvider {
  return {
    id,
    generate: async (request) => generatePrompt(request.prompt)
  }
}

function providerRequest(providerId: ImageProviderId) {
  return {
    provider: providerId,
    subjectKind: 'pc' as const,
    subjectId: 'pc-1',
    prompt: 'portrait prompt',
    campaignId: 'campaign-1'
  }
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body
  }
}
