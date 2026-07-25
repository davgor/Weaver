import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  sanitizeReleaseFilenames,
  verifyUpdaterMetadata
} from './verify-release-artifacts.mjs'

describe('sanitizeReleaseFilenames', () => {
  it('renames spaced artifacts and rewrites updater yml paths', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-release-'))
    writeFileSync(join(dir, 'AI TTRPG-Setup-0.2.0.exe'), 'bin')
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 0.2.0', 'path: AI TTRPG-Setup-0.2.0.exe', 'sha512: abc', ''].join('\n')
    )

    const renamed = sanitizeReleaseFilenames(dir)
    expect(renamed).toEqual(['AI TTRPG-Setup-0.2.0.exe → AI-TTRPG-Setup-0.2.0.exe'])
    expect(existsSync(join(dir, 'AI-TTRPG-Setup-0.2.0.exe'))).toBe(true)
    expect(existsSync(join(dir, 'AI TTRPG-Setup-0.2.0.exe'))).toBe(false)
    expect(readFileSync(join(dir, 'latest.yml'), 'utf8')).toContain('path: AI-TTRPG-Setup-0.2.0.exe')
  })
})

describe('verifyUpdaterMetadata', () => {
  it('requires latest.yml and ai-admin.yml channels', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-meta-'))
    writeFileSync(join(dir, 'AI-TTRPG-Setup-0.2.0.exe'), 'bin')
    writeFileSync(join(dir, 'AI-ADMIN-Setup-0.2.0.exe'), 'bin')
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 0.2.0', 'path: AI-TTRPG-Setup-0.2.0.exe', 'sha512: a', ''].join('\n')
    )
    writeFileSync(
      join(dir, 'ai-admin.yml'),
      ['version: 0.2.0', 'path: AI-ADMIN-Setup-0.2.0.exe', 'sha512: b', ''].join('\n')
    )

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(true)
    expect(result.checked).toEqual(['latest.yml', 'ai-admin.yml'])
  })

  it('fails when ai-admin.yml is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-meta-miss-'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'AI-TTRPG-Setup-0.2.0.exe'), 'bin')
    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 0.2.0', 'path: AI-TTRPG-Setup-0.2.0.exe', 'sha512: a', ''].join('\n')
    )

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/ai-admin\.yml/)
  })
})
