import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_MODEL, type InstallProgress, type LlmStatus } from '@weaver/llm-engine'
import { getLocalModelStatus, installLocalModel } from './localModelInstall.js'
import type { LocalLlmInstallPort } from './settingsPorts.js'

describe('getLocalModelStatus', () => {
  it('returns null when the install port is unavailable', async () => {
    await expect(getLocalModelStatus(undefined)).resolves.toBeNull()
  })

  it('delegates to LLMEngine getStatus', async () => {
    const status = statusFor('not_installed')
    const port: LocalLlmInstallPort = { getStatus: async () => status, install: async () => status }

    await expect(getLocalModelStatus(port)).resolves.toBe(status)
  })
})

describe('installLocalModel', () => {
  it('rejects when the install port is unavailable', async () => {
    await expect(installLocalModel(undefined)).rejects.toThrow(/unavailable/i)
  })

  it('forwards progress callbacks to LLMEngine install', async () => {
    const ready = statusFor('ready')
    const progress: InstallProgress[] = []
    const install = vi.fn(async (onProgress?: (event: InstallProgress) => void) => {
      onProgress?.({
        phase: 'installing',
        bytesDownloaded: 50,
        bytesTotal: 100,
        fraction: 0.5
      })
      return ready
    })
    const port: LocalLlmInstallPort = { getStatus: async () => ready, install }

    await expect(installLocalModel(port, (event) => progress.push(event))).resolves.toBe(ready)
    expect(progress).toHaveLength(1)
    expect(install).toHaveBeenCalledOnce()
  })
})

function statusFor(phase: LlmStatus['phase']): LlmStatus {
  return {
    phase,
    backend: phase === 'ready' ? 'cpu' : null,
    model: DEFAULT_MODEL,
    modelPath: phase === 'ready' ? '/data/model.gguf' : null,
    error: null,
    bytesDownloaded: 0,
    bytesTotal: null
  }
}
