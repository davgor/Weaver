import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const SHIPPABLE_EXT = /\.(exe|dmg|zip|ya?ml|blockmap)$/i
const REJECT_NAME =
  /^(builder-.*|.*\.__uninstaller\.exe|win-unpacked|mac|mac-arm64|mac-x64|mac-universal|linux-unpacked)$/i

/** True when a top-level release entry should ship to GitHub Releases / updater verify. */
export function isShippableReleaseFile(name) {
  if (REJECT_NAME.test(name)) {
    return false
  }
  return SHIPPABLE_EXT.test(name)
}

/**
 * @param {string} releaseDir
 * @returns {string[]} basenames of shippable files in releaseDir
 */
export function listShippableReleaseFiles(releaseDir) {
  return readdirSync(releaseDir)
    .filter((name) => {
      if (!isShippableReleaseFile(name)) {
        return false
      }
      return statSync(join(releaseDir, name)).isFile()
    })
    .sort()
}

/**
 * Copy shippable files from package release dirs into a flat outDir.
 * @param {{ sources: string[], outDir: string }} options
 * @returns {string[]} basenames copied
 */
export function stageReleaseArtifacts({ sources, outDir }) {
  mkdirSync(outDir, { recursive: true })
  /** @type {Set<string>} */
  const seen = new Set()
  /** @type {string[]} */
  const staged = []
  for (const source of sources) {
    copyShippableFromSource(source, outDir, seen, staged)
  }
  return staged.sort()
}

/**
 * @param {string} source
 * @param {string} outDir
 * @param {Set<string>} seen
 * @param {string[]} staged
 */
function copyShippableFromSource(source, outDir, seen, staged) {
  for (const name of listShippableReleaseFiles(source)) {
    if (seen.has(name)) {
      throw new Error(`duplicate shippable file: ${name}`)
    }
    seen.add(name)
    copyFileSync(join(source, name), join(outDir, name))
    staged.push(name)
  }
}

/**
 * Detect nested upload-artifact layouts like ElectronAITTRPG/release/*.
 * @param {string} dir
 */
function findNestedReleaseDirs(dir) {
  /** @type {string[]} */
  const nested = []
  for (const name of readdirSync(dir)) {
    const candidate = join(dir, name, 'release')
    if (existsSync(candidate) && statSync(candidate).isDirectory()) {
      nested.push(candidate)
    }
  }
  return nested
}

/**
 * Hoist shippable files from nested package/release dirs to dir root, then remove nests.
 * @param {string} dir
 * @returns {string[]} basenames hoisted
 */
export function flattenNestedReleaseDownloads(dir) {
  const nestedDirs = findNestedReleaseDirs(dir)
  if (nestedDirs.length === 0) {
    return []
  }
  const staged = stageReleaseArtifacts({ sources: nestedDirs, outDir: dir })
  for (const nestedRelease of nestedDirs) {
    rmSync(join(nestedRelease, '..'), { recursive: true, force: true })
  }
  return staged
}

export function runStageReleaseArtifacts(outDir, sources) {
  if (!outDir || sources.length === 0) {
    console.error(
      'usage: node scripts/stage-release-artifacts.mjs <outDir> <sourceDir> [sourceDir...]'
    )
    process.exit(1)
  }
  const staged = stageReleaseArtifacts({ sources, outDir })
  for (const name of staged) {
    console.log(`staged: ${name}`)
  }
  if (staged.length === 0) {
    console.error(`no shippable release files found in: ${sources.join(', ')}`)
    process.exit(1)
  }
  return staged
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isCli) {
  const [outDir, ...sources] = process.argv.slice(2)
  runStageReleaseArtifacts(outDir, sources)
}
