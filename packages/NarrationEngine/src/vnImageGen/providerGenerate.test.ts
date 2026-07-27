import { describe, expect, it } from 'vitest'
import type { ImageProvider, ImageProviderId, ProviderImageRequest } from '../index.js'
import { generateViaImageProvider } from './index.js'

function provider(
  id: ImageProviderId,
  generate: (request: ProviderImageRequest) => Promise<string | null>
): ImageProvider {
  return { id, generate }
}

describe('generateViaImageProvider gating', () => {
  it('degrades without calling providers when generative tokens are disabled', async () => {
    const calls: ProviderImageRequest[] = []
    const result = await generateViaImageProvider(
      {
        settings: { provider: 'cloud', generativeTokensEnabled: false },
        prompt: 'p',
        subjectId: 's',
        subjectKind: 'vn_sprite'
      },
      {
        providers: {
          cloud: provider('cloud', async (request) => {
            calls.push(request)
            return '/x.png'
          })
        }
      }
    )

    expect(result).toEqual({ imagePath: null, provider: 'cloud', degraded: true })
    expect(calls).toEqual([])
  })

  it('degrades when no provider is configured for the requested rail', async () => {
    const result = await generateViaImageProvider(
      {
        settings: { provider: 'cloud', generativeTokensEnabled: true },
        prompt: 'p',
        subjectId: 's',
        subjectKind: 'vn_sprite'
      },
      { providers: {} }
    )

    expect(result).toEqual({ imagePath: null, provider: 'cloud', degraded: true })
  })
})

describe('generateViaImageProvider sprite requests', () => {
  it('forwards seed and vn_sprite image kind and returns the generated path', async () => {
    const seen: ProviderImageRequest[] = []
    const result = await generateViaImageProvider(
      {
        settings: { provider: 'local', generativeTokensEnabled: true },
        prompt: 'sprite prompt',
        subjectId: 'hero-david',
        subjectKind: 'vn_sprite',
        campaignId: 'c1',
        seed: 'vn-seed-abc'
      },
      {
        providers: {
          local: provider('local', async (request) => {
            seen.push(request)
            return '/sprite.png'
          })
        }
      }
    )

    expect(result).toEqual({ imagePath: '/sprite.png', provider: 'local', degraded: false })
    expect(seen[0]).toMatchObject({
      provider: 'local',
      subjectKind: 'vn_sprite',
      subjectId: 'hero-david',
      prompt: 'sprite prompt',
      campaignId: 'c1',
      seed: 'vn-seed-abc',
      imageKind: 'vn_sprite'
    })
  })
})

describe('generateViaImageProvider background requests', () => {
  it('maps vn_background subjectKind to the vn_background image kind', async () => {
    const seen: ProviderImageRequest[] = []
    await generateViaImageProvider(
      {
        settings: { provider: 'local', generativeTokensEnabled: true },
        prompt: 'bg',
        subjectId: 'preset:tavern_interior',
        subjectKind: 'vn_background'
      },
      {
        providers: {
          local: provider('local', async (request) => {
            seen.push(request)
            return '/bg.png'
          })
        }
      }
    )

    expect(seen[0]?.imageKind).toBe('vn_background')
  })
})

describe('generateViaImageProvider degradation', () => {
  it('degrades when the provider throws', async () => {
    const result = await generateViaImageProvider(
      {
        settings: { provider: 'player2', generativeTokensEnabled: true },
        prompt: 'p',
        subjectId: 's',
        subjectKind: 'vn_sprite'
      },
      {
        providers: {
          player2: provider('player2', async () => {
            throw new Error('down')
          })
        }
      }
    )

    expect(result).toEqual({ imagePath: null, provider: 'player2', degraded: true })
  })

  it('degrades when the provider returns null', async () => {
    const result = await generateViaImageProvider(
      {
        settings: { provider: 'player2', generativeTokensEnabled: true },
        prompt: 'p',
        subjectId: 's',
        subjectKind: 'vn_sprite'
      },
      { providers: { player2: provider('player2', async () => null) } }
    )

    expect(result).toEqual({ imagePath: null, provider: 'player2', degraded: true })
  })
})
