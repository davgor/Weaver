import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  flattenNestedReleaseDownloads,
  isShippableReleaseFile,
  stageReleaseArtifacts
} from './stage-release-artifacts.mjs'

function makeDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix))
}

function seedPackageRelease(dir, files) {
  mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, name), body)
  }
  mkdirSync(join(dir, 'win-unpacked'), { recursive: true })
  writeFileSync(join(dir, 'win-unpacked', 'app.exe'), 'unpacked')
}

describe('isShippableReleaseFile', () => {
  it('accepts installers, blockmaps, and updater metadata', () => {
    expect(isShippableReleaseFile('AI-TTRPG-Setup-0.2.0.exe')).toBe(true)
    expect(isShippableReleaseFile('AI-TTRPG-0.2.0-arm64.dmg')).toBe(true)
    expect(isShippableReleaseFile('AI-TTRPG-0.2.0-mac.zip')).toBe(true)
    expect(isShippableReleaseFile('latest.yml')).toBe(true)
    expect(isShippableReleaseFile('ai-admin.yml')).toBe(true)
    expect(isShippableReleaseFile('AI-TTRPG-Setup-0.2.0.exe.blockmap')).toBe(true)
  })

  it('rejects unpacked trees, builder junk, and uninstallers', () => {
    expect(isShippableReleaseFile('win-unpacked')).toBe(false)
    expect(isShippableReleaseFile('builder-debug.yml')).toBe(false)
    expect(isShippableReleaseFile('builder-effective-config.yaml')).toBe(false)
    expect(isShippableReleaseFile('AI-TTRPG-Setup-0.2.0.__uninstaller.exe')).toBe(false)
    expect(isShippableReleaseFile('notes.txt')).toBe(false)
  })
})

describe('stageReleaseArtifacts', () => {
  it('copies shippable files from multiple package release dirs into a flat out dir', () => {
    const root = makeDir('weaver-stage-src-')
    const aittrpg = join(root, 'ElectronAITTRPG', 'release')
    const admin = join(root, 'ElectronAdmin', 'release')
    seedPackageRelease(aittrpg, {
      'latest.yml': 'version: 0.2.0\npath: AI-TTRPG-Setup-0.2.0.exe\n',
      'AI-TTRPG-Setup-0.2.0.exe': 'bin',
      'builder-debug.yml': 'debug'
    })
    seedPackageRelease(admin, {
      'ai-admin.yml': 'version: 0.2.0\npath: AI-ADMIN-Setup-0.2.0.exe\n',
      'AI-ADMIN-Setup-0.2.0.exe': 'bin'
    })
    const out = join(root, 'staged')

    const staged = stageReleaseArtifacts({ sources: [aittrpg, admin], outDir: out })

    expect(staged.sort()).toEqual(
      [
        'AI-ADMIN-Setup-0.2.0.exe',
        'AI-TTRPG-Setup-0.2.0.exe',
        'ai-admin.yml',
        'latest.yml'
      ].sort()
    )
    expect(readdirSync(out).sort()).toEqual(staged.sort())
    expect(existsSync(join(out, 'win-unpacked'))).toBe(false)
    expect(existsSync(join(out, 'builder-debug.yml'))).toBe(false)
  })

  it('throws when two sources produce the same shippable filename', () => {
    const root = makeDir('weaver-stage-clash-')
    const a = join(root, 'a')
    const b = join(root, 'b')
    seedPackageRelease(a, { 'latest.yml': 'a' })
    seedPackageRelease(b, { 'latest.yml': 'b' })
    expect(() =>
      stageReleaseArtifacts({ sources: [a, b], outDir: join(root, 'out') })
    ).toThrow(/duplicate shippable file: latest\.yml/)
  })
})

describe('flattenNestedReleaseDownloads', () => {
  it('hoists nested ElectronAITTRPG/release and ElectronAdmin/release files', () => {
    const root = makeDir('weaver-flat-')
    const nestedA = join(root, 'ElectronAITTRPG', 'release')
    const nestedB = join(root, 'ElectronAdmin', 'release')
    seedPackageRelease(nestedA, {
      'latest.yml': 'version: 0.2.0\npath: AI-TTRPG-Setup-0.2.0.exe\n',
      'AI-TTRPG-Setup-0.2.0.exe': 'bin'
    })
    seedPackageRelease(nestedB, {
      'ai-admin.yml': 'version: 0.2.0\npath: AI-ADMIN-Setup-0.2.0.exe\n',
      'AI-ADMIN-Setup-0.2.0.exe': 'bin'
    })

    const moved = flattenNestedReleaseDownloads(root)

    expect(moved.sort()).toEqual(
      [
        'AI-ADMIN-Setup-0.2.0.exe',
        'AI-TTRPG-Setup-0.2.0.exe',
        'ai-admin.yml',
        'latest.yml'
      ].sort()
    )
    expect(existsSync(join(root, 'latest.yml'))).toBe(true)
    expect(existsSync(join(root, 'ai-admin.yml'))).toBe(true)
    expect(existsSync(join(root, 'ElectronAITTRPG'))).toBe(false)
    expect(existsSync(join(root, 'ElectronAdmin'))).toBe(false)
  })

  it('is a no-op when the directory is already flat', () => {
    const root = makeDir('weaver-flat-noop-')
    writeFileSync(join(root, 'latest.yml'), 'version: 0.2.0\npath: a.exe\n')
    writeFileSync(join(root, 'a.exe'), 'bin')
    expect(flattenNestedReleaseDownloads(root)).toEqual([])
    expect(readdirSync(root).sort()).toEqual(['a.exe', 'latest.yml'])
  })

  it('preserves already-flat files while hoisting nested package release dirs', () => {
    const root = makeDir('weaver-flat-mix-')
    writeFileSync(join(root, 'AI-TTRPG-0.2.0-arm64.dmg'), 'dmg')
    const nested = join(root, 'ElectronAITTRPG', 'release')
    seedPackageRelease(nested, {
      'latest.yml': 'version: 0.2.0\npath: AI-TTRPG-Setup-0.2.0.exe\n',
      'AI-TTRPG-Setup-0.2.0.exe': 'bin'
    })

    flattenNestedReleaseDownloads(root)
    expect(existsSync(join(root, 'AI-TTRPG-0.2.0-arm64.dmg'))).toBe(true)
    expect(existsSync(join(root, 'latest.yml'))).toBe(true)
  })
})

describe('stage + flatten integration with copy', () => {
  it('round-trips staged artifacts through a nested download layout', () => {
    const root = makeDir('weaver-roundtrip-')
    const src = join(root, 'pkg', 'release')
    seedPackageRelease(src, {
      'latest.yml': 'version: 0.2.0\npath: AI-TTRPG-Setup-0.2.0.exe\n',
      'AI-TTRPG-Setup-0.2.0.exe': 'bin',
      'AI-TTRPG-Setup-0.2.0.exe.blockmap': 'map'
    })
    const staged = join(root, 'staged')
    stageReleaseArtifacts({ sources: [src], outDir: staged })

    const downloaded = join(root, 'downloaded')
    const nested = join(downloaded, 'ElectronAITTRPG', 'release')
    mkdirSync(nested, { recursive: true })
    for (const name of readdirSync(staged)) {
      copyFileSync(join(staged, name), join(nested, name))
    }

    flattenNestedReleaseDownloads(downloaded)
    expect(readdirSync(downloaded).sort()).toEqual(
      [
        'AI-TTRPG-Setup-0.2.0.exe',
        'AI-TTRPG-Setup-0.2.0.exe.blockmap',
        'latest.yml'
      ].sort()
    )
  })
})
