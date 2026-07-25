import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { Downloader, FileStore, InstallProgress } from './types.js'
import { existsSync } from 'node:fs'

export function nodeFileStore(): FileStore {
  return {
    exists: (path) => existsSync(path),
    ensureDir: async (path) => {
      await mkdir(path, { recursive: true })
    },
    join: (...parts) => join(...parts)
  }
}

export function fetchDownloader(): Downloader {
  return {
    download: (url, destPath, onProgress) => downloadWithFetch(url, destPath, onProgress)
  }
}

async function downloadWithFetch(
  url: string,
  destPath: string,
  onProgress: (progress: InstallProgress) => void
): Promise<void> {
  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`Download failed (${response.status}) for ${url}`)
  }
  await mkdir(dirname(destPath), { recursive: true })
  const total = contentLength(response)
  let downloaded = 0
  const input = Readable.fromWeb(response.body as never)
  input.on('data', (chunk: Buffer | string) => {
    downloaded += Buffer.byteLength(chunk)
    onProgress(progressEvent(downloaded, total))
  })
  await pipeline(input, createWriteStream(destPath))
}

function contentLength(response: Response): number | null {
  const raw = response.headers.get('content-length')
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function progressEvent(bytesDownloaded: number, bytesTotal: number | null): InstallProgress {
  return {
    phase: 'installing',
    bytesDownloaded,
    bytesTotal,
    fraction: bytesTotal && bytesTotal > 0 ? bytesDownloaded / bytesTotal : null
  }
}
