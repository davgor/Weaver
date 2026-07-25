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
})
