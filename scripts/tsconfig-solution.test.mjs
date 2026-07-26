import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(rootDir, relativePath), 'utf8'))
}

describe('solution-style tsconfigs (IDE-safe)', () => {
  it('root tsconfig uses files:[] instead of empty include', () => {
    const cfg = readJson('tsconfig.json')
    expect(cfg.files).toEqual([])
    expect(cfg.include).toBeUndefined()
  })

  it.each([
    ['packages/ElectronAdmin'],
    ['packages/ElectronAITTRPG'],
  ])('%s solution + leaf configs enable composite on references', (pkg) => {
    const solution = readJson(`${pkg}/tsconfig.json`)
    expect(solution.files).toEqual([])
    expect(solution.references).toEqual([
      { path: './tsconfig.node.json' },
      { path: './tsconfig.web.json' },
    ])

    const node = readJson(`${pkg}/tsconfig.node.json`)
    const web = readJson(`${pkg}/tsconfig.web.json`)
    expect(node.compilerOptions.composite).toBe(true)
    expect(web.compilerOptions.composite).toBe(true)
    expect(web.compilerOptions.noEmit).not.toBe(true)
  })
})
