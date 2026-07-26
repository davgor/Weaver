/**
 * Run the real GitHub Actions workflows locally via `act`, so "npm run ci:act"
 * is one command instead of something to remember/retype per delivery-standards.
 * Checks Docker first and fails fast with a clear message instead of a cryptic
 * act error when the daemon isn't up.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'

const DEFAULT_WORKFLOWS = [
  {
    file: '.github/workflows/pr-checks.yml',
    platform: 'windows-latest=catthehacker/ubuntu:act-latest'
  },
  {
    file: '.github/workflows/deadcode.yml',
    platform: 'ubuntu-latest=catthehacker/ubuntu:act-latest'
  }
]

const WINGET_ACT_PATH =
  'C:\\Users\\davgo\\AppData\\Local\\Microsoft\\WinGet\\Packages\\' +
  'nektos.act_Microsoft.Winget.Source_8wekyb3d8bbwe\\act.exe'

function defaultWhich(bin) {
  const result = spawnSync(process.platform === 'win32' ? 'where' : 'which', [bin], {
    encoding: 'utf8'
  })
  return result.status === 0
}

/**
 * @param {object} [opts]
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {(bin: string) => boolean} [opts.which]
 * @param {(path: string) => boolean} [opts.existsSyncFn]
 */
export function resolveActBinary({ env = process.env, which = defaultWhich, existsSyncFn = existsSync } = {}) {
  if (env.ACT_BIN) return env.ACT_BIN
  if (which('act')) return 'act'
  if (existsSyncFn(WINGET_ACT_PATH)) return WINGET_ACT_PATH
  return null
}

/** @param {{ file: string, platform: string }} workflow */
export function buildActArgs(workflow) {
  return [
    'pull_request',
    '-W',
    workflow.file,
    '-P',
    workflow.platform,
    '--container-architecture',
    'linux/amd64',
    '--pull=false'
  ]
}

function defaultRunCommand(command, args) {
  return spawnSync(command, args, { stdio: 'ignore' })
}

/** @param {(command: string, args: string[]) => { status: number | null }} [runCommand] */
export function isDockerAvailable(runCommand = defaultRunCommand) {
  return runCommand('docker', ['info']).status === 0
}

/**
 * @param {{
 *   dockerAvailable?: () => boolean
 *   resolveAct?: () => string | null
 *   runAct?: (bin: string, args: string[]) => { status: number | null }
 *   log?: (msg: string) => void
 *   error?: (msg: string) => void
 *   workflows?: Array<{ file: string, platform: string }>
 * }} [deps]
 */
function resolveMainDeps(deps = {}) {
  return {
    log: deps.log ?? console.log,
    error: deps.error ?? console.error,
    dockerAvailable: deps.dockerAvailable ?? isDockerAvailable,
    resolveAct: deps.resolveAct ?? resolveActBinary,
    runAct: deps.runAct ?? ((bin, args) => spawnSync(bin, args, { stdio: 'inherit' })),
    workflows: deps.workflows ?? DEFAULT_WORKFLOWS
  }
}

/** @param {(msg: string) => void} log */
function printHelp(log) {
  log('Usage: npm run ci:act')
  log('Runs pr-checks.yml and deadcode.yml locally via act. Requires Docker running.')
  log('Override the act binary with ACT_BIN=/path/to/act if it is not on PATH.')
}

/**
 * @param {{
 *   actBin: string
 *   workflows: Array<{ file: string, platform: string }>
 *   runAct: (bin: string, args: string[]) => { status: number | null }
 *   log: (msg: string) => void
 *   error: (msg: string) => void
 * }} opts
 */
function runWorkflows({ actBin, workflows, runAct, log, error }) {
  for (const workflow of workflows) {
    log(`\n> Running ${workflow.file} via act...`)
    const result = runAct(actBin, buildActArgs(workflow))
    if (result.status !== 0) {
      error(`\nFAILED: ${workflow.file} did not succeed under act (exit ${result.status}).`)
      return 1
    }
    log(`PASSED: ${workflow.file}`)
  }
  return 0
}

/**
 * @param {string[]} [argv]
 * @param {{
 *   dockerAvailable?: () => boolean
 *   resolveAct?: () => string | null
 *   runAct?: (bin: string, args: string[]) => { status: number | null }
 *   log?: (msg: string) => void
 *   error?: (msg: string) => void
 *   workflows?: Array<{ file: string, platform: string }>
 * }} [deps]
 */
export async function main(argv = process.argv.slice(2), deps = {}) {
  const { log, error, dockerAvailable, resolveAct, runAct, workflows } = resolveMainDeps(deps)

  if (argv.includes('--help') || argv.includes('-h')) {
    printHelp(log)
    return 0
  }

  if (!dockerAvailable()) {
    error('Docker is not running or unreachable.')
    error('Start Docker Desktop, then retry: npm run ci:act')
    return 1
  }

  const actBin = resolveAct()
  if (!actBin) {
    error('Could not find `act`. Install it (e.g. `winget install nektos.act`) or set ACT_BIN.')
    return 1
  }

  return runWorkflows({ actBin, workflows, runAct, log, error })
}

const isDirectRun =
  process.argv[1] &&
  (process.argv[1].endsWith('run-act.mjs') ||
    process.argv[1].replace(/\\/g, '/').endsWith('scripts/run-act.mjs'))

if (isDirectRun) {
  main().then((code) => {
    process.exitCode = code
  })
}
