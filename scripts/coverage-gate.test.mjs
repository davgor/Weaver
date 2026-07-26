import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..')

function read(relativePath) {
  return readFileSync(join(rootDir, relativePath), 'utf8')
}

describe('80% coverage CI gate', () => {
  it('declares test:coverage and depends on @vitest/coverage-v8', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.scripts['test:coverage']).toBe('vitest run --coverage')
    expect(pkg.devDependencies['@vitest/coverage-v8']).toBeDefined()
  })

  it('enforces 80% V8 coverage thresholds in vitest.config.ts', () => {
    const config = read('vitest.config.ts')
    expect(config).toMatch(/provider:\s*['"]v8['"]/)
    expect(config).toMatch(/all:\s*false/)
    expect(config).toMatch(/thresholds:\s*\{[^}]*lines:\s*80/)
    expect(config).toMatch(/functions:\s*80/)
    expect(config).toMatch(/branches:\s*80/)
    expect(config).toMatch(/statements:\s*80/)
    expect(config).toContain('scripts/deadcode-check.mjs')
    expect(config).toContain('scripts/run-test-shard.mjs')
  })

  it('runs coverage as a dedicated pr-checks job', () => {
    const workflow = read('.github/workflows/pr-checks.yml')
    expect(workflow).toMatch(/^\s+coverage:/m)
    expect(workflow).toContain('npm run test:coverage')
    expect(workflow).toMatch(
      /coverage:[\s\S]*?Build engine packages[\s\S]*?npm run test:coverage/
    )
  })
})
