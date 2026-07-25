/**
 * Refresh .tsprune-ignore with current ts-prune findings (escape hatch for intentional exports).
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { discoverTsPruneProjects, normalizeTsPruneLine } from './deadcode-check.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IGNORE_PATH = join(ROOT, '.tsprune-ignore')

function runTsPrune(project) {
  const result = spawnSync('npx', ['ts-prune', '--project', project], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `ts-prune failed for ${project}`)
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => normalizeTsPruneLine(line))
    .filter(Boolean)
}

const findings = new Set()
for (const project of discoverTsPruneProjects(ROOT)) {
  for (const line of runTsPrune(project)) {
    if (line.includes('/dist/') || line.startsWith('dist/')) continue
    findings.add(line)
  }
}

const body = [
  '# Auto-refreshed by scripts/deadcode-refresh.mjs',
  '# Review before committing — prefer deleting dead exports over ignoring them.',
  '',
  ...[...findings].sort((a, b) => a.localeCompare(b))
].join('\n')

writeFileSync(IGNORE_PATH, `${body}\n`)
console.log(`Wrote ${findings.size} entries to .tsprune-ignore`)
