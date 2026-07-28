import { beforeEach, describe, expect, it } from 'vitest'
import type {
  ImageGenerationSettings,
  ImageProvider,
  ImageProviderId,
  ProviderImageRequest,
  VnCharacterIdentitySeed
} from '../index.js'
import { clearVnSpriteCache, createVnSpriteCache, generateVnSprite } from './index.js'

function david(): VnCharacterIdentitySeed {
  return {
    characterKey: 'hero-david',
    displayName: 'David',
    appearance: 'silver-haired swordsman in a blue travel coat'
  }
}

function enabled(provider: ImageProviderId): ImageGenerationSettings {
  return { provider, generativeTokensEnabled: true }
}

function provider(
  id: ImageProviderId,
  generate: (request: ProviderImageRequest) => Promise<string | null>
): ImageProvider {
  return { id, generate }
}

beforeEach(() => {
  clearVnSpriteCache()
})

describe('generateVnSprite prompt path', () => {
  it('builds a no-background sprite prompt and generates through the provider', async () => {
    const seen: ProviderImageRequest[] = []
    const result = await generateVnSprite(
      { identity: david(), stance: 'Standing', expression: 'Neutral', settings: enabled('local') },
      {
        providers: {
          local: provider('local', async (request) => {
            seen.push(request)
            return '/sprite.png'
          })
        }
      }
    )

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.fromCache).toBe(false)
      expect(result.asset.imagePath).toBe('/sprite.png')
      expect(result.asset.provider).toBe('local')
      expect(result.asset.prompt.fullPrompt).toMatch(/no background|transparent/i)
      expect(result.asset.cacheKey).toEqual({
        characterKey: 'hero-david',
        stance: 'Standing',
        expression: 'Neutral'
      })
    }
    expect(seen[0]?.prompt).toMatch(/no background|transparent/i)
    expect(seen[0]?.subjectKind).toBe('vn_sprite')
    expect(seen[0]?.seed).toMatch(/^vn-seed-/)
  })
})

describe('generateVnSprite cache hits', () => {
  it('serves the cached asset on repeat requests for the same key', async () => {
    let calls = 0
    const cache = createVnSpriteCache()
    const deps = {
      providers: {
        local: provider('local', async () => {
          calls += 1
          return `/sprite-${calls}.png`
        })
      },
      cache
    }

    const first = await generateVnSprite(
      { identity: david(), stance: 'Standing', expression: 'Neutral', settings: enabled('local') },
      deps
    )
    const second = await generateVnSprite(
      { identity: david(), stance: 'Standing', expression: 'Neutral', settings: enabled('local') },
      deps
    )

    expect(first.status).toBe('ready')
    expect(second.status).toBe('ready')
    if (second.status === 'ready') {
      expect(second.fromCache).toBe(true)
      expect(second.asset.imagePath).toBe('/sprite-1.png')
    }
    expect(calls).toBe(1)
  })
})

describe('generateVnSprite cache keys', () => {
  it('caches distinct stance/expression combinations separately', async () => {
    let calls = 0
    const cache = createVnSpriteCache()
    const deps = {
      providers: {
        local: provider('local', async () => {
          calls += 1
          return `/sprite-${calls}.png`
        })
      },
      cache
    }

    await generateVnSprite(
      { identity: david(), stance: 'Standing', expression: 'Neutral', settings: enabled('local') },
      deps
    )
    await generateVnSprite(
      { identity: david(), stance: 'Fighting', expression: 'Angry', settings: enabled('local') },
      deps
    )

    expect(calls).toBe(2)
  })
})

describe('generateVnSprite degradation', () => {
  it('degrades and retains the prompt when no provider is available', async () => {
    const result = await generateVnSprite(
      { identity: david(), stance: 'Fighting', expression: 'Angry', settings: enabled('cloud') },
      { providers: {} }
    )

    expect(result.status).toBe('degraded')
    if (result.status === 'degraded') {
      expect(result.provider).toBe('cloud')
      expect(result.prompt.fullPrompt).toMatch(/no background|transparent/i)
    }
  })

  it('regenerates after a degraded result rather than caching failure', async () => {
    const cache = createVnSpriteCache()
    const failed = await generateVnSprite(
      { identity: david(), stance: 'Sitting', expression: 'Sad', settings: enabled('local') },
      { providers: {}, cache }
    )
    const ok = await generateVnSprite(
      { identity: david(), stance: 'Sitting', expression: 'Sad', settings: enabled('local') },
      { providers: { local: provider('local', async () => '/ok.png') }, cache }
    )

    expect(failed.status).toBe('degraded')
    expect(ok.status).toBe('ready')
    if (ok.status === 'ready') {
      expect(ok.fromCache).toBe(false)
      expect(ok.asset.imagePath).toBe('/ok.png')
    }
  })
})
