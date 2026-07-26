import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  collectUpdaterPaths,
  runVerifyReleaseArtifacts,
  sanitizeReleaseFilenames,
  verifyUpdaterMetadata
} from './verify-release-artifacts.mjs'

function seedNestedDownloadLayout(root) {
  const aittrpg = join(root, 'ElectronAITTRPG', 'release')
  const admin = join(root, 'ElectronAdmin', 'release')
  mkdirSync(aittrpg, { recursive: true })
  mkdirSync(admin, { recursive: true })
  writeFileSync(join(aittrpg, 'AI-TTRPG-Setup-0.2.0.exe'), 'bin')
  writeFileSync(join(admin, 'AI-ADMIN-Setup-0.2.0.exe'), 'bin')
  writeChannelYml(aittrpg, 'latest.yml', 'AI-TTRPG-Setup-0.2.0.exe')
  writeChannelYml(admin, 'ai-admin.yml', 'AI-ADMIN-Setup-0.2.0.exe')
}

function writeChannelYml(dir, name, artifact) {
  writeFileSync(
    join(dir, name),
    ['version: 0.2.0', `path: ${artifact}`, 'sha512: a', ''].join('\n')
  )
}

function seedWinArtifacts(dir) {
  writeFileSync(join(dir, 'AI-TTRPG-Setup-0.2.0.exe'), 'bin')
  writeFileSync(join(dir, 'AI-ADMIN-Setup-0.2.0.exe'), 'bin')
}

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

  it('returns empty when nothing needs renaming', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-release-clean-'))
    writeFileSync(join(dir, 'AI-TTRPG-Setup-0.2.0.exe'), 'bin')
    expect(sanitizeReleaseFilenames(dir)).toEqual([])
  })
})

describe('collectUpdaterPaths', () => {
  it('extracts path and url entries', () => {
    expect(
      collectUpdaterPaths(['path: a.exe', 'url: b.exe', 'sha512: x', '- path: c.exe'].join('\n'))
    ).toEqual(['a.exe', 'b.exe', 'c.exe'])
  })
})

describe('verifyUpdaterMetadata success', () => {
  it('requires latest.yml and ai-admin.yml channels', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-meta-'))
    seedWinArtifacts(dir)
    writeChannelYml(dir, 'latest.yml', 'AI-TTRPG-Setup-0.2.0.exe')
    writeChannelYml(dir, 'ai-admin.yml', 'AI-ADMIN-Setup-0.2.0.exe')

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(true)
    expect(result.checked).toEqual(['latest.yml', 'ai-admin.yml'])
  })

  it('verifies optional mac metadata when present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-meta-mac-'))
    seedWinArtifacts(dir)
    writeFileSync(join(dir, 'AI-TTRPG-0.2.0-mac.zip'), 'bin')
    writeChannelYml(dir, 'latest.yml', 'AI-TTRPG-Setup-0.2.0.exe')
    writeChannelYml(dir, 'ai-admin.yml', 'AI-ADMIN-Setup-0.2.0.exe')
    writeChannelYml(dir, 'latest-mac.yml', 'AI-TTRPG-0.2.0-mac.zip')
    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(true)
    expect(result.checked).toContain('latest-mac.yml')
  })
})

describe('verifyUpdaterMetadata failures', () => {
  it('fails when ai-admin.yml is missing', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-meta-miss-'))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'AI-TTRPG-Setup-0.2.0.exe'), 'bin')
    writeChannelYml(dir, 'latest.yml', 'AI-TTRPG-Setup-0.2.0.exe')

    const result = verifyUpdaterMetadata(dir)
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/ai-admin\.yml/)
  })

  it('fails on empty, unsafe, or missing artifact references', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-meta-bad-'))
    seedWinArtifacts(dir)
    writeFileSync(join(dir, 'latest.yml'), 'version: 0.2.0\n')
    writeChannelYml(dir, 'ai-admin.yml', 'AI-ADMIN-Setup-0.2.0.exe')
    expect(verifyUpdaterMetadata(dir).error).toMatch(/no path\/url/)

    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 0.2.0', 'path: bad name.exe', ''].join('\n')
    )
    expect(verifyUpdaterMetadata(dir).error).toMatch(/unsafe url/)

    writeFileSync(
      join(dir, 'latest.yml'),
      ['version: 0.2.0', 'path: missing.exe', ''].join('\n')
    )
    expect(verifyUpdaterMetadata(dir).error).toMatch(/missing\.exe/)
  })
})

describe('runVerifyReleaseArtifacts', () => {
  it('logs success for a valid release dir', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-run-ok-'))
    seedWinArtifacts(dir)
    writeChannelYml(dir, 'latest.yml', 'AI-TTRPG-Setup-0.2.0.exe')
    writeChannelYml(dir, 'ai-admin.yml', 'AI-ADMIN-Setup-0.2.0.exe')
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(runVerifyReleaseArtifacts(dir).ok).toBe(true)
    expect(log).toHaveBeenCalledWith('latest.yml: ok')
    log.mockRestore()
  })

  it('flattens nested package release downloads before verifying', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-run-nested-'))
    seedNestedDownloadLayout(dir)
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})
    expect(runVerifyReleaseArtifacts(dir).ok).toBe(true)
    expect(log).toHaveBeenCalledWith('flattened: latest.yml')
    expect(log).toHaveBeenCalledWith('latest.yml: ok')
    expect(log).toHaveBeenCalledWith('ai-admin.yml: ok')
    log.mockRestore()
  })
})
