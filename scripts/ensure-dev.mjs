/**
 * Bootstrap everything needed before `npm run admin` / `npm run ai-ttrpg` launches Electron.
 *
 * Steps (in order):
 * 1. npm install — if node_modules missing or package-lock.json is newer
 * 2. Electron binary install
 * 3. Build engine packages (dist/ for workspace imports)
 * 4. Run migrations (scripts/migrate.mjs — no-op until DB exists)
 */
import { spawnSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ELECTRON_WORKSPACE = join(ROOT, 'packages', 'ElectronAdmin')

/**
 * @param {string[]} argv
 * @param {string} root
 */
export function resolveWorkspaceFromArgv(argv, root = ROOT) {
  const flag = argv.find((arg) => arg.startsWith('--workspace='))
  if (!flag) {
    return join(root, 'packages', 'ElectronAdmin')
  }
  const value = flag.slice('--workspace='.length).trim()
  if (!value) {
    return join(root, 'packages', 'ElectronAdmin')
  }
  return join(root, value)
}

/**
 * @param {{
 *   nodeModulesExists: boolean
 *   lockExists: boolean
 *   lockMtimeMs: number
 *   modulesMtimeMs: number
 * }} state
 */
export function needsNpmInstall(state) {
  if (!state.nodeModulesExists) return true
  if (!state.lockExists) return false
  return state.lockMtimeMs > state.modulesMtimeMs
}

/**
 * @param {{ install: boolean }} options
 * @returns {Array<'install' | 'electron' | 'engines' | 'migrate'>}
 */
export function planEnsureDevSteps(options) {
  /** @type {Array<'install' | 'electron' | 'engines' | 'migrate'>} */
  const steps = []
  if (options.install) steps.push('install')
  steps.push('electron', 'engines', 'migrate')
  return steps
}

/**
 * @param {{
 *   rootElectronExists: boolean
 *   workspaceElectronExists: boolean
 *   root: string
 *   workspace: string
 * }} options
 */
export function resolveElectronInstallScript(options) {
  if (options.rootElectronExists) {
    return join(options.root, 'node_modules', 'electron', 'install.js')
  }
  if (options.workspaceElectronExists) {
    return join(options.workspace, 'node_modules', 'electron', 'install.js')
  }
  return null
}

/**
 * @param {string} root
 */
export function readInstallState(root = ROOT) {
  const nodeModules = join(root, 'node_modules')
  const lock = join(root, 'package-lock.json')
  const nodeModulesExists = existsSync(nodeModules)
  const lockExists = existsSync(lock)
  return {
    nodeModulesExists,
    lockExists,
    lockMtimeMs: lockExists ? statSync(lock).mtimeMs : 0,
    modulesMtimeMs: nodeModulesExists ? statSync(nodeModules).mtimeMs : 0
  }
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {string} cwd
 * @param {(cmd: string, args: string[], cwd: string) => { status: number | null }} [runner]
 */
function run(command, args, cwd, runner) {
  const result =
    runner?.(command, args, cwd) ??
    spawnSync(command, args, {
      cwd,
      stdio: 'inherit',
      // Windows: npm is a .cmd shim and needs a shell; node.exe must not
      // (paths under "Program Files" break when shell-concatenated).
      shell: process.platform === 'win32' && command === 'npm',
      env: process.env
    })
  const status = result.status ?? 1
  if (status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${status}`)
  }
}

/**
 * @param {string} root
 * @param {string} workspace
 */
function resolveElectronScript(root, workspace) {
  return resolveElectronInstallScript({
    rootElectronExists: existsSync(join(root, 'node_modules', 'electron', 'install.js')),
    workspaceElectronExists: existsSync(
      join(workspace, 'node_modules', 'electron', 'install.js')
    ),
    root,
    workspace
  })
}

/**
 * @param {'install' | 'electron' | 'engines' | 'migrate'} step
 * @param {{
 *   root: string
 *   workspace: string
 *   runner?: (cmd: string, args: string[], cwd: string) => { status: number | null }
 *   log: (msg: string) => void
 * }} ctx
 */
function runStep(step, ctx) {
  if (step === 'install') {
    ctx.log('ensure-dev: npm install')
    run('npm', ['install'], ctx.root, ctx.runner)
    return
  }
  if (step === 'electron') {
    const script = resolveElectronScript(ctx.root, ctx.workspace)
    if (!script) {
      throw new Error('electron package not found — run npm install first')
    }
    ctx.log(`ensure-dev: electron binary (${script})`)
    run(process.execPath, [script], ctx.root, ctx.runner)
    return
  }
  if (step === 'engines') {
    ctx.log('ensure-dev: build engines')
    run('npm', ['run', 'build:engines'], ctx.root, ctx.runner)
    return
  }
  ctx.log('ensure-dev: migrate')
  run(process.execPath, [join(ctx.root, 'scripts', 'migrate.mjs')], ctx.root, ctx.runner)
}

/**
 * @param {{
 *   root?: string
 *   workspace?: string
 *   runner?: (cmd: string, args: string[], cwd: string) => { status: number | null }
 *   log?: (msg: string) => void
 * }} [options]
 */
export function ensureDev(options = {}) {
  const root = options.root ?? ROOT
  const workspace = options.workspace ?? ELECTRON_WORKSPACE
  const log = options.log ?? console.log
  const install = needsNpmInstall(readInstallState(root))
  const steps = planEnsureDevSteps({ install })
  log(`ensure-dev: ${steps.join(' → ')}`)
  for (const step of steps) {
    runStep(step, { root, workspace, runner: options.runner, log })
  }
  return { steps }
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isCli) {
  try {
    ensureDev({
      workspace: resolveWorkspaceFromArgv(process.argv)
    })
  } catch (err) {
    console.error(err instanceof Error ? err.message : err)
    process.exitCode = 1
  }
}
