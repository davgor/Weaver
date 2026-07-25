/**
 * Merge Vitest JSON reporter output into a per-file timings map.
 *
 * CLI: node scripts/merge-test-timings.mjs --previous scripts/test-timings.json \
 *   --out merged-timings.json shard-timings-0.json shard-timings-1.json
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

/**
 * @param {string} filePath
 * @param {string} root
 */
export function toRepoRelative(filePath, root) {
  const normalized = filePath.replace(/\\/g, '/')
  if (!normalized.startsWith('/') && !/^[A-Za-z]:/.test(normalized)) {
    return normalized.replace(/^\.\//, '')
  }

  for (const marker of ['/packages/', '/scripts/']) {
    const idx = normalized.lastIndexOf(marker)
    if (idx >= 0) return normalized.slice(idx + 1)
  }

  const abs = resolve(filePath)
  const rel = relative(resolve(root), abs).replace(/\\/g, '/')
  return rel.replace(/^\.\//, '')
}

/**
 * @param {{
 *   duration?: number
 *   startTime?: number
 *   endTime?: number
 *   assertionResults?: { duration?: number }[]
 * }} row
 */
function durationFromRow(row) {
  if (typeof row.duration === 'number' && Number.isFinite(row.duration)) {
    return Math.max(0, Math.round(row.duration))
  }
  if (
    typeof row.startTime === 'number' &&
    typeof row.endTime === 'number' &&
    Number.isFinite(row.startTime) &&
    Number.isFinite(row.endTime)
  ) {
    return Math.max(0, Math.round(row.endTime - row.startTime))
  }
  if (!Array.isArray(row.assertionResults)) return 0
  const sum = row.assertionResults.reduce((total, a) => {
    const d = typeof a?.duration === 'number' ? a.duration : 0
    return total + d
  }, 0)
  return Math.max(0, Math.round(sum))
}

/**
 * @param {unknown} report
 * @param {string} root
 * @returns {Record<string, number>}
 */
export function extractFileTimings(report, root) {
  /** @type {Record<string, number>} */
  const out = {}
  if (!report || typeof report !== 'object') return out
  const results = /** @type {{ testResults?: unknown }} */ (report).testResults
  if (!Array.isArray(results)) return out

  for (const entry of results) {
    if (!entry || typeof entry !== 'object') continue
    const row = /** @type {{ name?: string } & Parameters<typeof durationFromRow>[0] } */ (entry)
    if (typeof row.name !== 'string' || !row.name) continue
    out[toRepoRelative(row.name, root)] = durationFromRow(row)
  }
  return out
}

/**
 * @param {Record<string, number>[]} maps
 * @returns {Record<string, number>}
 */
export function mergeTimingMaps(maps) {
  /** @type {Record<string, number>} */
  const out = {}
  for (const map of maps) {
    for (const [file, ms] of Object.entries(map)) {
      if (typeof ms === 'number' && Number.isFinite(ms) && ms >= 0) out[file] = ms
    }
  }
  return out
}

/**
 * @param {string[]} argv
 */
export function parseMergeArgs(argv) {
  /** @type {string[]} */
  const inputs = []
  let previous = ''
  let out = 'merged-timings.json'
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--previous' && argv[i + 1]) previous = argv[++i]
    else if (arg.startsWith('--previous=')) previous = arg.slice('--previous='.length)
    else if (arg === '--out' && argv[i + 1]) out = argv[++i]
    else if (arg.startsWith('--out=')) out = arg.slice('--out='.length)
    else if (!arg.startsWith('--')) inputs.push(arg)
  }
  return { inputs, previous, out }
}

/**
 * @param {{ inputs: string[]; previous?: string; out: string }} options
 */
export function runMergeTestTimings(options) {
  /** @type {Record<string, number>[]} */
  const maps = []
  if (options.previous) {
    try {
      maps.push(JSON.parse(readFileSync(options.previous, 'utf8')))
    } catch {
      maps.push({})
    }
  }
  for (const input of options.inputs) {
    maps.push(JSON.parse(readFileSync(input, 'utf8')))
  }
  const merged = mergeTimingMaps(maps)
  writeFileSync(options.out, `${JSON.stringify(merged, null, 2)}\n`)
  return merged
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isCli) {
  runMergeTestTimings(parseMergeArgs(process.argv.slice(2)))
}
