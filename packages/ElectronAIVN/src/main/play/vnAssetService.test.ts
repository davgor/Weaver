import { describe, expect, it, vi } from 'vitest'
import type {
  GenerateVnBackgroundDeps,
  GenerateVnSpriteDeps,
  ImageGenerationSettings,
  VnBackgroundGenerateRequest,
  VnBackgroundGenerateResult,
  VnBeatPlaceholder,
  VnImagePrompt,
  VnSpriteGenerateRequest,
  VnSpriteGenerateResult
} from '@weaver/narration-engine'
import type { VnPlaySnapshot } from '../../shared/play/types.js'
import type { VnAssetsUpdate } from '../../shared/play/assetTypes.js'
import { createVnAssetService, type VnAssetServiceDeps } from './vnAssetService.js'

const settings: ImageGenerationSettings = { provider: 'local', generativeTokensEnabled: true }

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('vnAssetService', () => {
  it('queueFromSnapshot returns synchronously and emits an initial loading set', () => {
    const updates: VnAssetsUpdate[] = []
    const service = createVnAssetService(baseDeps({ onUpdate: (u) => updates.push(u) }))

    const returned = service.queueFromSnapshot(sceneSnapshot())

    expect(returned).toBeUndefined()
    expect(updates).toHaveLength(1)
    expect(updates[0]?.campaignId).toBe('vn-1')
    expect(updates[0]?.assets.every((a) => a.status === 'loading')).toBe(true)
    expect(updates[0]?.assets.map((a) => a.slot).sort()).toEqual(['background', 'mc'])
  })

  it('eventually emits ready with imagePath as slots resolve', async () => {
    const updates: VnAssetsUpdate[] = []
    const service = createVnAssetService(
      baseDeps({
        onUpdate: (u) => updates.push(u),
        generateSprite: async () => spriteReady('/img/mc.png'),
        generateBackground: async () => backgroundReady('/img/bg.png')
      })
    )

    service.queueFromSnapshot(sceneSnapshot())
    await flush()

    const latest = updates[updates.length - 1]
    const mc = latest?.assets.find((a) => a.slot === 'mc')
    const bg = latest?.assets.find((a) => a.slot === 'background')
    expect(mc?.status).toBe('ready')
    expect(bg?.status).toBe('ready')
    expect(mc && mc.status === 'ready' ? mc.imagePath : null).toBe('/img/mc.png')
    expect(bg && bg.status === 'ready' ? bg.imagePath : null).toBe('/img/bg.png')
  })

  it('degraded provider result becomes failed while preserving label + fullPrompt', async () => {
    const updates: VnAssetsUpdate[] = []
    const service = createVnAssetService(
      baseDeps({
        onUpdate: (u) => updates.push(u),
        generateSprite: async (req) => spriteDegraded(req),
        generateBackground: async (req) => backgroundDegraded(req)
      })
    )

    service.queueFromSnapshot(sceneSnapshot())
    await flush()

    const latest = updates[updates.length - 1]
    const mc = latest?.assets.find((a) => a.slot === 'mc')
    expect(mc?.status).toBe('failed')
    expect(mc?.label).toContain('MC label')
    expect(mc?.fullPrompt).toContain('mc full prompt')
  })

  it('does not throw from queueFromSnapshot when generation throws, and marks slot failed', async () => {
    const updates: VnAssetsUpdate[] = []
    const service = createVnAssetService(
      baseDeps({
        onUpdate: (u) => updates.push(u),
        generateSprite: async () => {
          throw new Error('boom')
        },
        generateBackground: async () => {
          throw new Error('boom')
        }
      })
    )

    expect(() => service.queueFromSnapshot(sceneSnapshot())).not.toThrow()
    await flush()

    const latest = updates[updates.length - 1]
    expect(latest?.assets.every((a) => a.status === 'failed')).toBe(true)
    expect(latest?.assets.find((a) => a.slot === 'mc')?.fullPrompt).toContain('mc full prompt')
  })

  it('cancel() prevents late updates from being emitted', async () => {
    const updates: VnAssetsUpdate[] = []
    let resolveSprite: (result: VnSpriteGenerateResult) => void = () => undefined
    const service = createVnAssetService(
      baseDeps({
        onUpdate: (u) => updates.push(u),
        generateSprite: () =>
          new Promise<VnSpriteGenerateResult>((resolve) => {
            resolveSprite = resolve
          }),
        generateBackground: () => new Promise<VnBackgroundGenerateResult>(() => undefined)
      })
    )

    service.queueFromSnapshot(sceneSnapshot())
    const afterQueue = updates.length
    service.cancel()
    resolveSprite(spriteReady('/img/late.png'))
    await flush()

    expect(updates.length).toBe(afterQueue)
    expect(updates.every((u) => u.assets.every((a) => a.status !== 'ready'))).toBe(true)
  })

  it('generates an npc sprite when the snapshot carries a speaker', async () => {
    const captured: VnSpriteGenerateRequest[] = []
    const service = createVnAssetService(
      baseDeps({
        onUpdate: () => undefined,
        generateSprite: async (req) => {
          captured.push(req)
          return spriteReady('/img/x.png')
        },
        generateBackground: async () => backgroundReady('/img/bg.png')
      })
    )

    service.queueFromSnapshot(npcSnapshot())
    await flush()

    const npc = captured.find((r) => r.identity.characterKey === 'npc-1')
    expect(npc).toBeDefined()
    expect(npc?.identity.displayName).toBe('Harbor Warden')
    expect(captured.some((r) => r.identity.characterKey === 'vn-1-vn-mc')).toBe(true)
  })

  it('starting a newer queue invalidates in-flight work from the previous snapshot', async () => {
    const updates: VnAssetsUpdate[] = []
    let resolveFirst: (result: VnSpriteGenerateResult) => void = () => undefined
    let call = 0
    const service = createVnAssetService(
      baseDeps({
        onUpdate: (u) => updates.push(u),
        generateSprite: () => {
          call += 1
          if (call === 1) {
            return new Promise<VnSpriteGenerateResult>((resolve) => {
              resolveFirst = resolve
            })
          }
          return Promise.resolve(spriteReady('/img/second.png'))
        },
        generateBackground: async () => backgroundReady('/img/bg.png')
      })
    )

    service.queueFromSnapshot(sceneSnapshot())
    service.queueFromSnapshot(sceneSnapshot())
    resolveFirst(spriteReady('/img/first.png'))
    await flush()

    const readyImages = updates
      .flatMap((u) => u.assets)
      .filter((a): a is Extract<typeof a, { status: 'ready' }> => a.status === 'ready')
      .map((a) => a.imagePath)
    expect(readyImages).not.toContain('/img/first.png')
    expect(readyImages).toContain('/img/second.png')
  })
})

function baseDeps(overrides: Partial<VnAssetServiceDeps>): VnAssetServiceDeps {
  return {
    generateSprite: async () => spriteReady('/img/default.png'),
    generateBackground: async () => backgroundReady('/img/default-bg.png'),
    settings,
    onUpdate: () => undefined,
    ...overrides
  }
}

function spriteReady(imagePath: string): VnSpriteGenerateResult {
  return {
    status: 'ready',
    fromCache: false,
    asset: {
      cacheKey: { characterKey: 'k', stance: 'Standing', expression: 'Neutral' },
      imagePath,
      provider: 'local',
      prompt: samplePrompt()
    }
  }
}

function spriteDegraded(req: VnSpriteGenerateRequest): VnSpriteGenerateResult {
  return { status: 'degraded', prompt: samplePrompt(), provider: req.settings.provider }
}

function backgroundReady(imagePath: string): VnBackgroundGenerateResult {
  return { status: 'ready', imagePath, prompt: samplePrompt(), fromCache: false, provider: 'local' }
}

function backgroundDegraded(req: VnBackgroundGenerateRequest): VnBackgroundGenerateResult {
  return { status: 'degraded', prompt: samplePrompt(), provider: req.settings.provider }
}

function samplePrompt(): VnImagePrompt {
  return { label: 'x', fullPrompt: 'x' }
}

function scenePlaceholders(): readonly VnBeatPlaceholder[] {
  return [
    { slot: 'mc', label: 'MC label', fullPrompt: 'mc full prompt' },
    { slot: 'background', label: 'BG label', fullPrompt: 'bg full prompt' }
  ]
}

function npcPlaceholders(): readonly VnBeatPlaceholder[] {
  return [
    { slot: 'mc', label: 'MC label', fullPrompt: 'mc full prompt' },
    { slot: 'npc', label: 'NPC label', fullPrompt: 'npc full prompt' },
    { slot: 'background', label: 'BG label', fullPrompt: 'bg full prompt' }
  ]
}

function sceneSnapshot(): VnPlaySnapshot {
  return {
    campaignId: 'vn-1',
    characterId: 'vn-1-vn-mc',
    mode: 'scene',
    beatText: 'Fog rolls over the dock.',
    speakerName: null,
    speakerId: null,
    options: ['A', 'B'],
    freeText: '',
    placeholders: scenePlaceholders(),
    scene: [],
    social: [],
    mainCharacter: { name: 'Ryn Vale', personality: 'quiet', appearance: 'salt-stained coat' },
    cast: [{ npcId: 'npc-1', displayName: 'Harbor Warden', role: 'mentor' }],
    phase: 'story',
    storyComplete: false,
    actIndex: 1
  }
}

function npcSnapshot(): VnPlaySnapshot {
  return {
    ...sceneSnapshot(),
    mode: 'npc',
    speakerName: 'Harbor Warden',
    speakerId: 'npc-1',
    placeholders: npcPlaceholders()
  }
}
