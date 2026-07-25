import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootPackage = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')
)

describe('root admin / game boot scripts', () => {
  it('boots Weaver Admin via npm run admin (ensure-dev then electron-admin)', () => {
    expect(rootPackage.scripts.preadmin).toBe('node scripts/ensure-dev.mjs')
    expect(rootPackage.scripts.admin).toBe(
      'npm run dev --workspace=@weaver/electron-admin --if-present'
    )
    expect(rootPackage.scripts.predev).toBeUndefined()
    expect(rootPackage.scripts.dev).toBeUndefined()
  })

  it('keeps npm run ai-ttrpg for the game client', () => {
    expect(rootPackage.scripts['preai-ttrpg']).toBe(
      'node scripts/ensure-dev.mjs --workspace=packages/ElectronAITTRPG'
    )
    expect(rootPackage.scripts['ai-ttrpg']).toBe(
      'npm run dev --workspace=@weaver/electron-aittrpg --if-present'
    )
  })

  it('packages both Electron apps for win and mac', () => {
    expect(rootPackage.scripts['package:win']).toContain('@weaver/electron-aittrpg')
    expect(rootPackage.scripts['package:win']).toContain('@weaver/electron-admin')
    expect(rootPackage.scripts['package:mac']).toContain('@weaver/electron-aittrpg')
    expect(rootPackage.scripts['package:mac']).toContain('@weaver/electron-admin')
    expect(rootPackage.scripts.package).toContain('@weaver/electron-aittrpg')
    expect(rootPackage.scripts.package).toContain('@weaver/electron-admin')
  })
})
