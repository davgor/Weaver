import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findForbiddenTerminology } from './terminologyGuards.js'

type FixtureSample = {
  id: string
  text: string
  expectClean: boolean
  expectedViolations?: string[]
}

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'fixtures',
  'terminology-samples.json'
)
const fixtures = JSON.parse(readFileSync(fixturePath, 'utf8')) as FixtureSample[]

describe('terminology fixtures', () => {
  it.each(fixtures)('$id matches terminology expectations', (sample) => {
    const violations = findForbiddenTerminology(sample.text)
    expect(violations.length === 0).toBe(sample.expectClean)

    if (!sample.expectClean && sample.expectedViolations !== undefined) {
      for (const label of sample.expectedViolations) {
        expect(violations).toContain(label)
      }
    }
  })
})
