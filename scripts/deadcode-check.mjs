/**
 * Fail when ts-prune reports new unused exports not listed in .tsprune-ignore.
 * Scans every package tsconfig (engine packages + Electron node/web configs).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const IGNORE_PATH = join(ROOT, '.tsprune-ignore')

/** @param {string} line */
export function normalizeTsPruneLine(line) {
  if (!line) return ''
  let normalized = line.replace(/^[^\w\\/]+/, '').trim()
  if (!normalized) return ''
  normalized = normalized.replace(/\\+/g, '/')
  normalized = normalized.replace(/\s*\([^)]*\)\s*$/, '')
  normalized = normalized.replace(/^\//, '')
  return normalized
}

/** @param {string} path */
export function readIgnoreSet(path) {
  if (!existsSync(path)) return new Set()
  return new Set(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .filter((line) => {
        const trimmed = line.trim()
        return trimmed.length > 0 && !trimmed.startsWith('#')
      })
      .map((line) => normalizeTsPruneLine(line))
      .filter(Boolean)
  )
}

/**
 * @param {string} root
 * @param {string} pkgDir
 * @param {string[]} projects
 */
function pushElectronProjects(root, pkgDir, projects) {
  for (const name of ['tsconfig.node.json', 'tsconfig.web.json']) {
    const abs = join(pkgDir, name)
    if (existsSync(abs)) projects.push(relative(root, abs).replace(/\\/g, '/'))
  }
}

/**
 * @param {string} root
 * @param {string} pkgDir
 * @param {string[]} projects
 */
function pushEngineProject(root, pkgDir, projects) {
  const abs = join(pkgDir, 'tsconfig.json')
  try {
    if (statSync(abs).isFile()) projects.push(relative(root, abs).replace(/\\/g, '/'))
  } catch {
    // skip
  }
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function discoverTsPruneProjects(root) {
  /** @type {string[]} */
  const projects = []
  const packagesRoot = join(root, 'packages')
  if (!existsSync(packagesRoot)) return projects

  for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const pkgDir = join(packagesRoot, entry.name)
    if (
      entry.name === 'ElectronAdmin' ||
      entry.name === 'ElectronAITTRPG' ||
      entry.name === 'ElectronAIVN'
    ) {
      pushElectronProjects(root, pkgDir, projects)
      continue
    }
    pushEngineProject(root, pkgDir, projects)
  }
  return projects.sort((a, b) => a.localeCompare(b))
}

/** @param {string} project */
function runTsPrune(project) {
  const result = spawnSync('npx', ['ts-prune', '--project', project], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: true
  })
  if (result.error) throw result.error
  if (result.status !== 0) {
    const stderr = result.stderr?.trim()
    throw new Error(stderr || `ts-prune failed for ${project} with exit code ${result.status}`)
  }
  return result.stdout
    .split(/\r?\n/)
    .map((line) => normalizeTsPruneLine(line))
    .filter(Boolean)
}

/** @param {string} line */
function isDistFinding(line) {
  return line.includes('/dist/') || line.startsWith('dist/')
}

/**
 * @param {string[]} projects
 * @param {Set<string>} ignore
 */
function collectFindings(projects, ignore) {
  /** @type {string[]} */
  const findings = []
  for (const project of projects) {
    for (const line of runTsPrune(project)) {
      if (isDistFinding(line) || ignore.has(line)) continue
      findings.push(line)
    }
  }
  return findings
}

function main() {
  const ignore = readIgnoreSet(IGNORE_PATH)
  const projects = discoverTsPruneProjects(ROOT)
  const findings = collectFindings(projects, ignore)

  if (findings.length > 0) {
    console.error('New dead exports detected:')
    for (const line of findings) console.error(line)
    process.exit(1)
  }

  console.log(`No new dead exports found across ${projects.length} projects.`)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main()
}
