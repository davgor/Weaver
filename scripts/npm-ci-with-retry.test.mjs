import { describe, expect, it } from 'vitest'
import { buildNpmCiEnv, runNpmCiWithRetry } from './npm-ci-with-retry.mjs'

describe('npm-ci-with-retry', () => {
  it('sets ELECTRON_SKIP_BINARY_DOWNLOAD', () => {
    expect(buildNpmCiEnv({}).ELECTRON_SKIP_BINARY_DOWNLOAD).toBe('1')
  })

  it('retries until success', async () => {
    let calls = 0
    const result = await runNpmCiWithRetry({
      attempts: 3,
      delayMs: 1,
      runCommand: async () => {
        calls += 1
        return { code: calls === 2 ? 0 : 1 }
      },
      rmNodeModules: async () => {},
      sleep: async () => {},
      log: () => {}
    })
    expect(result.attempts).toBe(2)
    expect(calls).toBe(2)
  })

  it('continues retrying when node_modules cleanup throws', async () => {
    let calls = 0
    const logs = []
    const result = await runNpmCiWithRetry({
      attempts: 3,
      delayMs: 1,
      runCommand: async () => {
        calls += 1
        return { code: calls === 3 ? 0 : 1 }
      },
      rmNodeModules: async () => {
        throw new Error('EPERM: operation not permitted')
      },
      sleep: async () => {},
      log: (msg) => logs.push(msg)
    })
    expect(result.attempts).toBe(3)
    expect(calls).toBe(3)
    expect(logs.some((msg) => msg.includes('cleanup warning'))).toBe(true)
  })
})
