import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const script = join(dirname(fileURLToPath(import.meta.url)), 'electron-postinstall.mjs')

describe('electron-postinstall', () => {
  it('no-ops when ELECTRON_SKIP_BINARY_DOWNLOAD=1', () => {
    const result = spawnSync(process.execPath, [script], {
      env: { ...process.env, ELECTRON_SKIP_BINARY_DOWNLOAD: '1' },
      encoding: 'utf8'
    })
    expect(result.status).toBe(0)
  })
})
