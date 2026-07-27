import { describe, expect, it } from 'vitest'
import {
  generateVnBackground,
  generateVnSprite,
  type ImageGenerationSettings,
  type ImageProvider,
  type ProviderImageRequest
} from '@weaver/narration-engine'
import type { VnPlaySnapshot } from '../../shared/play/types.js'
import type { VnAssetsUpdate } from '../../shared/play/assetTypes.js'
import { createVnAssetService } from './vnAssetService.js'

/**
 * Contract test: exercise the REAL NarrationEngine `generateVnSprite` /
 * `generateVnBackground` (no mocking of the provider's public API) through the
 * ElectronAIVN `vnAssetService`, using a fake `ImageProvider` that returns a path.
 */
describe('narrationEngine VN image contract emits ready updates', () => {
  it('drives real sprite + background generation and emits ready updates with the provider path', async () => {
    const campaignId = uniqueCampaign()
    const provider = fakeLocalProvider()
    const updates: VnAssetsUpdate[] = []
    const service = createVnAssetService({
      generateSprite: generateVnSprite,
      generateBackground: generateVnBackground,
      settings: enabledLocal(),
      providers: { local: provider.impl },
      onUpdate: (update) => updates.push(update)
    })

    service.queueFromSnapshot(sceneSnapshot(campaignId))
    await waitFor(() => allReady(updates))

    const latest = updates[updates.length - 1]
    const mc = latest?.assets.find((a) => a.slot === 'mc')
    const bg = latest?.assets.find((a) => a.slot === 'background')
    expect(mc?.status).toBe('ready')
    expect(bg?.status).toBe('ready')
    expect(mc && mc.status === 'ready' ? mc.imagePath : '').toContain(`${campaignId}-vn-mc`)
    expect(provider.requests.some((r) => r.subjectKind === 'vn_sprite')).toBe(true)
    expect(provider.requests.some((r) => r.subjectKind === 'vn_background')).toBe(true)
  })
})

describe('narrationEngine VN image contract caches sprites', () => {
  it('caches sprites by identity/stance/expression so the provider is not called twice', async () => {
    const campaignId = uniqueCampaign()
    const provider = fakeLocalProvider()

    const updatesA: VnAssetsUpdate[] = []
    const serviceA = createVnAssetService({
      generateSprite: generateVnSprite,
      generateBackground: generateVnBackground,
      settings: enabledLocal(),
      providers: { local: provider.impl },
      onUpdate: (u) => updatesA.push(u)
    })
    serviceA.queueFromSnapshot(sceneSnapshot(campaignId))
    await waitFor(() => allReady(updatesA))
    const firstSpriteCalls = provider.requests.filter((r) => r.subjectKind === 'vn_sprite').length

    const updatesB: VnAssetsUpdate[] = []
    const serviceB = createVnAssetService({
      generateSprite: generateVnSprite,
      generateBackground: generateVnBackground,
      settings: enabledLocal(),
      providers: { local: provider.impl },
      onUpdate: (u) => updatesB.push(u)
    })
    serviceB.queueFromSnapshot(sceneSnapshot(campaignId))
    await waitFor(() => allReady(updatesB))
    const secondSpriteCalls = provider.requests.filter((r) => r.subjectKind === 'vn_sprite').length

    expect(firstSpriteCalls).toBeGreaterThan(0)
    expect(secondSpriteCalls).toBe(firstSpriteCalls)
  })
})

function enabledLocal(): ImageGenerationSettings {
  return { provider: 'local', generativeTokensEnabled: true }
}

function fakeLocalProvider(): { impl: ImageProvider; requests: ProviderImageRequest[] } {
  const requests: ProviderImageRequest[] = []
  const impl: ImageProvider = {
    id: 'local',
    generate: async (request) => {
      requests.push(request)
      return `/fake/${request.subjectId}.png`
    }
  }
  return { impl, requests }
}

function allReady(updates: VnAssetsUpdate[]): boolean {
  const latest = updates[updates.length - 1]
  if (latest === undefined) return false
  return latest.assets.length > 0 && latest.assets.every((a) => a.status === 'ready')
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let i = 0; i < 100; i += 1) {
    if (predicate()) return
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
  throw new Error('waitFor: predicate never became true')
}

let counter = 0
function uniqueCampaign(): string {
  counter += 1
  return `vn-contract-${Date.now()}-${counter}`
}

function sceneSnapshot(campaignId: string): VnPlaySnapshot {
  return {
    campaignId,
    characterId: `${campaignId}-vn-mc`,
    mode: 'scene',
    beatText: 'Fog rolls over the dock as the last lantern dies.',
    speakerName: null,
    speakerId: null,
    options: ['A', 'B'],
    freeText: '',
    placeholders: [
      { slot: 'mc', label: 'MC', fullPrompt: 'A weary ranger, no background' },
      { slot: 'background', label: 'BG', fullPrompt: 'A foggy dock at dusk' }
    ],
    scene: [],
    social: [],
    mainCharacter: { name: 'Ryn Vale', personality: 'quiet', appearance: 'salt-stained coat' },
    cast: [],
    phase: 'story',
    storyComplete: false,
    actIndex: 1
  }
}
