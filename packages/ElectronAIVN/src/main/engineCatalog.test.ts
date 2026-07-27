import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../shared/engineHealth.js', () => ({
  summarizeEngineHealth: vi.fn()
}))

describe('buildStartupBoot', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reports ready when every engine is present', async () => {
    const { summarizeEngineHealth } = await import('../shared/engineHealth.js')
    vi.mocked(summarizeEngineHealth).mockReturnValue({
      ready: true,
      missing: [],
      label: 'Weaver engines ready'
    })
    const { buildStartupBoot } = await import('./engineCatalog.js')
    const boot = buildStartupBoot()
    expect(boot.phase).toBe('ready')
    expect(boot.progress).toBe(100)
    expect(boot.failureMessage).toBeNull()
    expect(boot.stageLabel).toBe('Ready')
  })

  it('reports failed when engine health is not ready', async () => {
    const { summarizeEngineHealth } = await import('../shared/engineHealth.js')
    vi.mocked(summarizeEngineHealth).mockReturnValue({
      ready: false,
      missing: ['LLMEngine'],
      label: 'Weaver engines missing: LLMEngine'
    })
    const { buildStartupBoot } = await import('./engineCatalog.js')
    const boot = buildStartupBoot()
    expect(boot.phase).toBe('failed')
    expect(boot.failureMessage).toContain('missing')
    expect(boot.stageLabel).toBe('Startup Interrupted')
  })
})
