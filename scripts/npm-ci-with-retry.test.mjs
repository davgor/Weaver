import { describe, expect, it, vi } from 'vitest'
import { buildNpmCiEnv, main, runNpmCiWithRetry } from './npm-ci-with-retry.mjs'

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

  it('throws after exhausting attempts', async () => {
    await expect(
      runNpmCiWithRetry({
        attempts: 2,
        delayMs: 1,
        runCommand: async () => ({ code: 7 }),
        rmNodeModules: async () => {},
        sleep: async () => {},
        log: () => {}
      })
    ).rejects.toThrow(/failed after 2 attempts \(last exit code 7\)/)
  })

  it('prints help from main', async () => {
    const log = vi.fn()
    const original = console.log
    console.log = log
    try {
      expect(await main(['--help'])).toBe(0)
      expect(log).toHaveBeenCalledWith('Usage: node scripts/npm-ci-with-retry.mjs')
    } finally {
      console.log = original
    }
  })
})
