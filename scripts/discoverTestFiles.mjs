/**
 * Discover Vitest test files across the Weaver monorepo.
 */
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * @param {{
 *   full: string
 *   entry: import('node:fs').Dirent
 *   match: RegExp
 *   root: string
 *   files: string[]
 * }} opts
 */
function collectEntry(opts) {
  const { full, entry, match, root, files } = opts
  if (entry.isDirectory()) {
    if (['node_modules', 'dist', 'out', 'release'].includes(entry.name)) return
    walk(full, match, root, files)
    return
  }
  if (entry.isFile() && match.test(entry.name)) {
    files.push(relative(root, full).replace(/\\/g, '/'))
  }
}

/**
 * @param {string} dir
 * @param {RegExp} match
 * @param {string} root
 * @param {string[]} files
 */
function walk(dir, match, root, files) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    collectEntry({ full: join(dir, entry.name), entry, match, root, files })
  }
}

/**
 * @param {string} root
 * @param {string[]} files
 */
function discoverPackageTests(root, files) {
  const packagesRoot = join(root, 'packages')
  let entries
  try {
    if (!statSync(packagesRoot).isDirectory()) return
    entries = readdirSync(packagesRoot, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const src = join(packagesRoot, entry.name, 'src')
    try {
      if (statSync(src).isDirectory()) walk(src, /\.test\.tsx?$/, root, files)
    } catch {
      // skip packages without src
    }
  }
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function discoverTestFiles(root) {
  /** @type {string[]} */
  const files = []
  discoverPackageTests(root, files)
  const scriptsRoot = join(root, 'scripts')
  try {
    if (statSync(scriptsRoot).isDirectory()) walk(scriptsRoot, /\.test\.mjs$/, root, files)
  } catch {
    // no scripts/
  }
  return files.sort((a, b) => a.localeCompare(b))
}
