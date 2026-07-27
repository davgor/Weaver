import { beforeEach, describe, expect, it } from 'vitest'
import type {
  ImageGenerationSettings,
  ImageProvider,
  ImageProviderId,
  ProviderImageRequest
} from '../index.js'
import { clearVnBackgroundCache, createVnBackgroundCache, generateVnBackground } from './index.js'

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
  clearVnBackgroundCache()
})

describe('generateVnBackground preset path', () => {
  it('generates a preset background and caches it by preset id', async () => {
    let calls = 0
    const cache = createVnBackgroundCache()
    const deps = {
      providers: {
        local: provider('local', async () => {
          calls += 1
          return `/bg-${calls}.png`
        })
      },
      cache
    }

    const first = await generateVnBackground(
      { background: { kind: 'preset', presetId: 'tavern_interior' }, settings: enabled('local') },
      deps
    )
    const second = await generateVnBackground(
      { background: { kind: 'preset', presetId: 'tavern_interior' }, settings: enabled('local') },
      deps
    )

    expect(first.status).toBe('ready')
    if (first.status === 'ready') {
      expect(first.fromCache).toBe(false)
      expect(first.imagePath).toBe('/bg-1.png')
      expect(first.provider).toBe('local')
    }
    if (second.status === 'ready') {
      expect(second.fromCache).toBe(true)
      expect(second.imagePath).toBe('/bg-1.png')
    }
    expect(calls).toBe(1)
  })
})

describe('generateVnBackground adaptive path', () => {
  it('generates from caller descriptors via the shared vn_background kind', async () => {
    const seen: ProviderImageRequest[] = []
    const result = await generateVnBackground(
      {
        background: {
          kind: 'adaptive',
          locationLabel: 'Mistfen Bog',
          sceneDescriptors: ['sunken boardwalks', 'green fog']
        },
        settings: enabled('local')
      },
      {
        providers: {
          local: provider('local', async (request) => {
            seen.push(request)
            return '/bog.png'
          })
        }
      }
    )

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.imagePath).toBe('/bog.png')
      expect(result.prompt.fullPrompt).toContain('Mistfen Bog')
    }
    expect(seen[0]?.subjectKind).toBe('vn_background')
    expect(seen[0]?.prompt).toContain('use only the listed caller facts')
  })
})

describe('generateVnBackground adaptive caching', () => {
  it('caches adaptive backgrounds separately per location and descriptor set', async () => {
    let calls = 0
    const cache = createVnBackgroundCache()
    const deps = {
      providers: {
        local: provider('local', async () => {
          calls += 1
          return `/adaptive-${calls}.png`
        })
      },
      cache
    }

    await generateVnBackground(
      { background: { kind: 'adaptive', locationLabel: 'A', sceneDescriptors: ['x'] }, settings: enabled('local') },
      deps
    )
    await generateVnBackground(
      { background: { kind: 'adaptive', locationLabel: 'A', sceneDescriptors: ['x'] }, settings: enabled('local') },
      deps
    )
    await generateVnBackground(
      { background: { kind: 'adaptive', locationLabel: 'B', sceneDescriptors: ['y'] }, settings: enabled('local') },
      deps
    )

    expect(calls).toBe(2)
  })
})

describe('generateVnBackground degradation', () => {
  it('degrades and retains the prompt when generation fails', async () => {
    const result = await generateVnBackground(
      { background: { kind: 'preset', presetId: 'forest_path' }, settings: enabled('cloud') },
      { providers: {} }
    )

    expect(result.status).toBe('degraded')
    if (result.status === 'degraded') {
      expect(result.provider).toBe('cloud')
      expect(result.prompt.label).toContain('Forest path')
    }
  })
})
