import { describe, expect, it, vi } from 'vitest'
import { installModel, readInstallStatus } from './install.js'
import { DEFAULT_MODEL } from './modelCatalog.js'
import type { FileStore, InstallProgress } from './types.js'

function memoryFiles(existing = new Set<string>()): FileStore {
  return {
    exists: (path) => existing.has(path),
    ensureDir: () => undefined,
    join: (...parts) => parts.join('/')
  }
}

describe('install lifecycle — status', () => {
  it('reports not_installed when the GGUF is missing', async () => {
    const status = await readInstallStatus({
      dataDir: '/data',
      files: memoryFiles(),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => true }
    })
    expect(status.phase).toBe('not_installed')
    expect(status.model).toEqual(DEFAULT_MODEL)
    expect(status.modelPath).toBeNull()
    expect(status.backend).toBeNull()
  })

  it('reports ready with vulkan when the model file exists and probe allows it', async () => {
    const path = `/data/models/${DEFAULT_MODEL.filename}`
    const status = await readInstallStatus({
      dataDir: '/data',
      files: memoryFiles(new Set([path])),
      downloader: { download: async () => undefined },
      probe: { supportsVulkan: () => true }
    })
    expect(status.phase).toBe('ready')
    expect(status.backend).toBe('vulkan')
    expect(status.modelPath).toBe(path)
  })
})

describe('install lifecycle — download', () => {
  it('downloads the model and emits progress, then becomes ready', async () => {
    const existing = new Set<string>()
    const progressEvents: InstallProgress[] = []
    const status = await installModel(
      {
        dataDir: '/data',
        files: memoryFiles(existing),
        downloader: {
          download: async (_url, destPath, onProgress) => {
            onProgress({ phase: 'installing', bytesDownloaded: 100, bytesTotal: 200, fraction: 0.5 })
            existing.add(destPath)
          }
        },
        probe: { supportsVulkan: () => false }
      },
      (event) => progressEvents.push(event)
    )
    expect(progressEvents).toHaveLength(1)
    expect(status.phase).toBe('ready')
    expect(status.backend).toBe('cpu')
    expect(status.modelPath).toBe(`/data/models/${DEFAULT_MODEL.filename}`)
  })

  it('records error phase when download fails', async () => {
    const ensureDir = vi.fn()
    const status = await installModel({
      dataDir: '/data',
      files: { exists: () => false, ensureDir, join: (...parts) => parts.join('/') },
      downloader: {
        download: async () => {
          throw new Error('network down')
        }
      },
      probe: { supportsVulkan: () => true }
    })
    expect(ensureDir).toHaveBeenCalled()
    expect(status.phase).toBe('error')
    expect(status.error).toMatch(/network down/)
  })
})
