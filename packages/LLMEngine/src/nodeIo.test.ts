import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchDownloader, nodeFileStore } from './nodeIo.js'
import type { InstallProgress } from './types.js'

const temps: string[] = []

afterEach(() => {
  vi.unstubAllGlobals()
  while (temps.length > 0) {
    const root = temps.pop()
    if (root) rmSync(root, { recursive: true, force: true })
  }
})

function tempDir(): string {
  const root = mkdtempSync(join(tmpdir(), 'weaver-nodeio-'))
  temps.push(root)
  return root
}

function streamBody(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes)
      controller.close()
    }
  })
}

function stubFetch(response: {
  ok: boolean
  status: number
  body: ReadableStream<Uint8Array> | null
  headers: { get: (name: string) => string | null }
}): void {
  vi.stubGlobal('fetch', vi.fn(async () => response))
}

describe('nodeFileStore', () => {
  it('exists, ensureDir, and join against the real filesystem', async () => {
    const root = tempDir()
    const store = nodeFileStore()
    const nested = store.join(root, 'a', 'b')
    expect(store.exists(nested)).toBe(false)
    await store.ensureDir(nested)
    expect(store.exists(nested)).toBe(true)
  })
})

describe('fetchDownloader with content-length', () => {
  it('downloads with progress when content-length is present', async () => {
    const root = tempDir()
    const dest = join(root, 'model.bin')
    const progress: InstallProgress[] = []
    stubFetch({
      ok: true,
      status: 200,
      body: streamBody('abc'),
      headers: { get: (name: string) => (name === 'content-length' ? '3' : null) }
    })

    await fetchDownloader().download('https://example.test/m.bin', dest, (p) => progress.push(p))
    expect(readFileSync(dest, 'utf8')).toBe('abc')
    expect(progress.at(-1)).toMatchObject({
      phase: 'installing',
      bytesDownloaded: 3,
      bytesTotal: 3,
      fraction: 1
    })
  })
})

describe('fetchDownloader without content-length', () => {
  it('reports null fraction when content-length is missing or invalid', async () => {
    const root = tempDir()
    const dest = join(root, 'model.bin')
    const progress: InstallProgress[] = []
    stubFetch({
      ok: true,
      status: 200,
      body: streamBody('xy'),
      headers: { get: () => 'nope' }
    })

    await fetchDownloader().download('https://example.test/m.bin', dest, (p) => progress.push(p))
    expect(progress.at(-1)?.bytesTotal).toBeNull()
    expect(progress.at(-1)?.fraction).toBeNull()
  })
})

describe('fetchDownloader errors', () => {
  it('throws when the response is not ok or has no body', async () => {
    const root = tempDir()
    const dest = join(root, 'model.bin')
    stubFetch({
      ok: false,
      status: 404,
      body: null,
      headers: { get: () => null }
    })
    await expect(
      fetchDownloader().download('https://example.test/missing', dest, () => {})
    ).rejects.toThrow(/Download failed \(404\)/)
  })
})
