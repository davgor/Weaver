import { describe, expect, it } from 'vitest'
import { llmEngine } from './index.js'

describe('@weaver/llm-engine', () => {
  it('reports healthy', () => {
    const health = llmEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/llm-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = llmEngine.listEndpoints()
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
    expect(endpoints.some((e) => e.name === 'getStatus')).toBe(true)
    expect(endpoints.some((e) => e.name === 'install')).toBe(true)
    expect(endpoints.some((e) => e.name === 'completeText')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await llmEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/llm-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(llmEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })

  it('describeRole advertises runtime control without invention', async () => {
    const role = await llmEngine.call('describeRole')
    expect(role).toMatchObject({
      invents: false,
      controlsRuntime: true,
      model: 'qwen2.5-7b-instruct-q4_k_m'
    })
  })
})
