import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { findForbiddenTerminology } from '../dist/terminologyGuards.js'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixturePath = join(packageRoot, 'fixtures', 'terminology-samples.json')

/** @typedef {{ id: string; text: string; expectClean: boolean; expectedViolations?: string[] }} FixtureSample */

/** @returns {FixtureSample[]} */
function readFixtures() {
  return JSON.parse(readFileSync(fixturePath, 'utf8'))
}

export function runTerminologyCheck() {
  const failures = []

  for (const sample of readFixtures()) {
    const violations = findForbiddenTerminology(sample.text)
    const clean = violations.length === 0

    if (clean !== sample.expectClean) {
      failures.push(
        `${sample.id}: expected ${sample.expectClean ? 'clean' : 'violations'} but found ${violations.join(', ') || 'none'}`
      )
      continue
    }

    if (!sample.expectClean && sample.expectedViolations !== undefined) {
      const missing = sample.expectedViolations.filter((label) => !violations.includes(label))
      if (missing.length > 0) {
        failures.push(`${sample.id}: missing expected violations: ${missing.join(', ')}`)
      }
    }
  }

  return { ok: failures.length === 0, failures }
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, '/')}`) {
  const result = runTerminologyCheck()
  if (!result.ok) {
    console.error('terminology:check failed:')
    for (const failure of result.failures) {
      console.error(`- ${failure}`)
    }
    process.exit(1)
  }
  console.log(`terminology:check passed (${readFixtures().length} fixtures)`)
}
