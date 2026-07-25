import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { bumpMinorVersion } from './bump-minor-version.mjs'

describe('bumpMinorVersion', () => {
  it('bumps root and both Electron package versions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'weaver-bump-'))
    const pkgPath = join(dir, 'package.json')
    const lockPath = join(dir, 'package-lock.json')
    const aittrpgDir = join(dir, 'packages', 'ElectronAITTRPG')
    const adminDir = join(dir, 'packages', 'ElectronAdmin')
    mkdirSync(aittrpgDir, { recursive: true })
    mkdirSync(adminDir, { recursive: true })
    const aittrpgPath = join(aittrpgDir, 'package.json')
    const adminPath = join(adminDir, 'package.json')
    writeFileSync(pkgPath, JSON.stringify({ name: 'weaver', version: '0.1.0' }))
    writeFileSync(
      lockPath,
      JSON.stringify({
        version: '0.1.0',
        packages: {
          '': { version: '0.1.0' },
          'packages/ElectronAITTRPG': { version: '0.1.0' },
          'packages/ElectronAdmin': { version: '0.1.0' }
        }
      })
    )
    writeFileSync(aittrpgPath, JSON.stringify({ name: '@weaver/electron-aittrpg', version: '0.1.0' }))
    writeFileSync(adminPath, JSON.stringify({ name: '@weaver/electron-admin', version: '0.1.0' }))

    const next = bumpMinorVersion(pkgPath, lockPath, aittrpgPath, adminPath)
    expect(next).toBe('0.2.0')
    expect(JSON.parse(readFileSync(pkgPath, 'utf8')).version).toBe('0.2.0')
    expect(JSON.parse(readFileSync(aittrpgPath, 'utf8')).version).toBe('0.2.0')
    expect(JSON.parse(readFileSync(adminPath, 'utf8')).version).toBe('0.2.0')
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    expect(lock.packages['packages/ElectronAITTRPG'].version).toBe('0.2.0')
    expect(lock.packages['packages/ElectronAdmin'].version).toBe('0.2.0')
  })
})
