import { describe, expect, it, vi } from 'vitest'
import { runStartupBoot } from './startupBoot.js'
import type { StartupBootPorts } from './startupBoot.js'

describe('runStartupBoot — engine and first-run paths', () => {
  it('fails when Weaver engines are unhealthy', async () => {
    const boot = await runStartupBoot(
      ports({
        enginesReady: false,
        engineLabel: 'Weaver engines missing: LLMEngine'
      })
    )
    expect(boot.phase).toBe('failed')
    expect(boot.failureMessage).toContain('missing')
  })

  it('reaches ready without warming when the model is not installed', async () => {
    const warm = vi.fn()
    const onProgress = vi.fn()
    const boot = await runStartupBoot(ports({ localPhase: 'not_installed', warm }), onProgress)
    expect(boot.phase).toBe('ready')
    expect(boot.progress).toBe(100)
    expect(warm).not.toHaveBeenCalled()
    expect(onProgress).toHaveBeenCalled()
  })
})

describe('runStartupBoot — returning-user warm', () => {
  it('warms the local runtime when the model is ready', async () => {
    const warm = vi.fn(async () => undefined)
    const stages: string[] = []
    const boot = await runStartupBoot(ports({ localPhase: 'ready', warm }), (update) => {
      stages.push(update.stageLabel)
    })
    expect(boot.phase).toBe('ready')
    expect(boot.statusText).toMatch(/local model|ready/i)
    expect(warm).toHaveBeenCalledOnce()
    expect(stages.some((label) => /local model/i.test(label))).toBe(true)
  })

  it('surfaces a recoverable failure when warm-up throws', async () => {
    const boot = await runStartupBoot(
      ports({
        localPhase: 'ready',
        warm: async () => {
          throw new Error('runtime refused')
        }
      })
    )
    expect(boot.phase).toBe('failed')
    expect(boot.failureMessage).toContain('runtime refused')
    expect(boot.stageLabel).toMatch(/local model/i)
  })
})

function ports(options: {
  enginesReady?: boolean
  engineLabel?: string
  localPhase?: 'not_installed' | 'installing' | 'ready' | 'error'
  warm?: () => Promise<void>
}): StartupBootPorts {
  return {
    checkEngines: () => ({
      ready: options.enginesReady ?? true,
      label: options.engineLabel ?? 'Weaver engines ready'
    }),
    getLocalPhase: async () => options.localPhase ?? 'not_installed',
    warmRuntime: options.warm ?? (async () => undefined)
  }
}
