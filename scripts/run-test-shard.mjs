/**
 * Run one duration-balanced Vitest shard (CI).
 *
 * Usage:
 *   node scripts/run-test-shard.mjs --index 0 [--target-ms 60000]
 *     [--timings scripts/test-timings.json] [--json-out shard-timings-0.json]
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { discoverTestFiles } from './discoverTestFiles.mjs'
import { extractFileTimings } from './merge-test-timings.mjs'
import { loadTimings, parsePlanArgs } from './test-plan-ci.mjs'
import { planTestShards } from './testShardPlan.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * @param {string[]} argv
 * @param {string} name
 * @param {(value: string) => void} assign
 */
function readFlag(argv, name, assign) {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === `--${name}` && argv[i + 1]) {
      assign(argv[++i])
      return
    }
    if (arg.startsWith(`--${name}=`)) {
      assign(arg.slice(`--${name}=`.length))
    }
  }
}

/**
 * @param {string[]} argv
 */
export function parseShardArgs(argv) {
  const base = parsePlanArgs(argv)
  let index = 0
  let jsonOut = ''
  let reportOut = ''
  readFlag(argv, 'index', (value) => {
    index = Number(value)
  })
  readFlag(argv, 'json-out', (value) => {
    jsonOut = value
  })
  readFlag(argv, 'report-out', (value) => {
    reportOut = value
  })
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid --index: ${index}`)
  }
  return { ...base, index, jsonOut, reportOut }
}

/**
 * Build a Windows-safe Vitest spawn (node + vitest.mjs, no npx.cmd).
 * @param {{ root: string; reportOut: string; shardFiles: string[] }} options
 */
export function buildVitestShardArgs({ root, reportOut, shardFiles }) {
  const vitestCli = join(root, 'node_modules', 'vitest', 'vitest.mjs')
  return {
    command: process.execPath,
    args: [
      vitestCli,
      'run',
      '--reporter=default',
      '--reporter=json',
      `--outputFile.json=${reportOut}`,
      ...shardFiles
    ]
  }
}

/**
 * @param {string} reportOut
 * @param {string} root
 * @param {string} jsonOut
 */
function writeShardTimings(reportOut, root, jsonOut) {
  try {
    const report = JSON.parse(readFileSync(reportOut, 'utf8'))
    const extracted = extractFileTimings(report, root)
    mkdirSync(dirname(jsonOut), { recursive: true })
    writeFileSync(jsonOut, `${JSON.stringify(extracted, null, 2)}\n`)
  } catch (err) {
    console.warn('Could not write shard timings:', err)
    writeFileSync(jsonOut, '{}\n')
  }
}

/**
 * @param {{
 *   root: string
 *   index: number
 *   plan: { shardCount: number; shards: string[][]; estimatesMs: number[] }
 *   reportOut: string
 *   jsonOut: string
 *   spawnVitest?: (
 *     command: string,
 *     args: string[]
 *   ) => { status: number | null; error?: Error }
 * }} options
 */
function executeShard(options) {
  const { root, index, plan, reportOut, jsonOut } = options
  const shardFiles = plan.shards[index]

  console.log(
    JSON.stringify(
      {
        shardIndex: index,
        shardCount: plan.shardCount,
        fileCount: shardFiles.length,
        estimateMs: plan.estimatesMs[index]
      },
      null,
      2
    )
  )

  if (shardFiles.length === 0) {
    writeFileSync(jsonOut, '{}\n')
    return { status: 0, shardFiles, jsonOut }
  }

  const { command, args } = buildVitestShardArgs({ root, reportOut, shardFiles })
  const spawnVitest =
    options.spawnVitest ??
    ((cmd, argv) =>
      spawnSync(cmd, argv, { cwd: root, stdio: 'inherit', shell: false, env: process.env }))

  const result = spawnVitest(command, args)
  if (result.error) console.error('Failed to spawn Vitest:', result.error)
  writeShardTimings(reportOut, root, jsonOut)
  return { status: result.status ?? 1, shardFiles, jsonOut }
}

/**
 * @param {{
 *   root?: string
 *   index: number
 *   targetMs?: number
 *   timingsPath?: string
 *   jsonOut?: string
 *   reportOut?: string
 *   spawnVitest?: (
 *     command: string,
 *     args: string[]
 *   ) => { status: number | null; error?: Error }
 * }} options
 */
export function runTestShard(options) {
  const root = options.root ?? ROOT
  const targetMs = options.targetMs ?? 60_000
  const timingsPath = options.timingsPath ?? join(root, 'scripts', 'test-timings.json')
  const plan = planTestShards({
    files: discoverTestFiles(root),
    timings: loadTimings(timingsPath),
    targetMs
  })

  if (options.index >= plan.shardCount) {
    throw new Error(`Shard index ${options.index} out of range (count=${plan.shardCount})`)
  }

  const reportOut = options.reportOut || join(root, `vitest-report-shard-${options.index}.json`)
  const jsonOut = options.jsonOut || join(root, `shard-timings-${options.index}.json`)
  return executeShard({
    root,
    index: options.index,
    plan,
    reportOut,
    jsonOut,
    spawnVitest: options.spawnVitest
  })
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = parseShardArgs(process.argv.slice(2))
  const { status } = runTestShard({
    ...args,
    jsonOut: args.jsonOut || undefined,
    reportOut: args.reportOut || undefined
  })
  process.exit(status === null ? 1 : status)
}
