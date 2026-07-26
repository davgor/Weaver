import { describe, expect, it } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ensureDev,
  needsNpmInstall,
  planEnsureDevSteps,
  resolveElectronInstallScript,
  resolveWorkspaceFromArgv
} from './ensure-dev.mjs'

describe('needsNpmInstall', () => {
  it('needs install when node_modules is missing', () => {
    expect(
      needsNpmInstall({
        nodeModulesExists: false,
        lockExists: true,
        lockMtimeMs: 100,
        modulesMtimeMs: 0
      })
    ).toBe(true)
  })

  it('needs install when lockfile is newer than node_modules', () => {
    expect(
      needsNpmInstall({
        nodeModulesExists: true,
        lockExists: true,
        lockMtimeMs: 200,
        modulesMtimeMs: 100
      })
    ).toBe(true)
  })

  it('skips install when node_modules is up to date with lockfile', () => {
    expect(
      needsNpmInstall({
        nodeModulesExists: true,
        lockExists: true,
        lockMtimeMs: 100,
        modulesMtimeMs: 200
      })
    ).toBe(false)
  })

  it('needs install when lockfile is missing but so is node_modules', () => {
    expect(
      needsNpmInstall({
        nodeModulesExists: false,
        lockExists: false,
        lockMtimeMs: 0,
        modulesMtimeMs: 0
      })
    ).toBe(true)
  })
})

describe('planEnsureDevSteps', () => {
  it('includes install when required, then electron, engines, migrate', () => {
    expect(planEnsureDevSteps({ install: true })).toEqual([
      'install',
      'electron',
      'engines',
      'migrate'
    ])
  })

  it('skips install when deps are ready', () => {
    expect(planEnsureDevSteps({ install: false })).toEqual([
      'electron',
      'engines',
      'migrate'
    ])
  })
})

describe('resolveElectronInstallScript', () => {
  it('prefers root hoisted electron install.js', () => {
    expect(
      resolveElectronInstallScript({
        rootElectronExists: true,
        workspaceElectronExists: false,
        root: join('repo'),
        workspace: join('repo', 'packages', 'ElectronAdmin')
      })
    ).toBe(join('repo', 'node_modules', 'electron', 'install.js'))
  })

  it('falls back to workspace electron when root is missing', () => {
    expect(
      resolveElectronInstallScript({
        rootElectronExists: false,
        workspaceElectronExists: true,
        root: join('repo'),
        workspace: join('repo', 'packages', 'ElectronAITTRPG')
      })
    ).toBe(join('repo', 'packages', 'ElectronAITTRPG', 'node_modules', 'electron', 'install.js'))
  })

  it('returns null when neither install script exists', () => {
    expect(
      resolveElectronInstallScript({
        rootElectronExists: false,
        workspaceElectronExists: false,
        root: join('repo'),
        workspace: join('repo', 'packages', 'ElectronAdmin')
      })
    ).toBeNull()
  })
})

describe('resolveWorkspaceFromArgv', () => {
  it('defaults to ElectronAdmin when no flag is set', () => {
    expect(resolveWorkspaceFromArgv(['node', 'ensure-dev.mjs'], join('repo'))).toBe(
      join('repo', 'packages', 'ElectronAdmin')
    )
  })

  it('honors --workspace for AI-TTRPG bootstrap', () => {
    expect(
      resolveWorkspaceFromArgv(
        ['node', 'ensure-dev.mjs', '--workspace=packages/ElectronAITTRPG'],
        join('repo')
      )
    ).toBe(join('repo', 'packages', 'ElectronAITTRPG'))
  })

  it('falls back to ElectronAdmin when --workspace= is empty', () => {
    expect(
      resolveWorkspaceFromArgv(['node', 'ensure-dev.mjs', '--workspace='], join('repo'))
    ).toBe(join('repo', 'packages', 'ElectronAdmin'))
  })
})

function withTempRoot(prefix, fn) {
  const root = mkdtempSync(join(tmpdir(), prefix))
  try {
    return fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('ensureDev when deps present', () => {
  it('runs electron, engines, and migrate when node_modules is already present', () => {
    withTempRoot('weaver-ensure-', (root) => {
      writeFileSync(join(root, 'package-lock.json'), '{}')
      mkdirSync(join(root, 'node_modules', 'electron'), { recursive: true })
      writeFileSync(join(root, 'node_modules', 'electron', 'install.js'), '')
      const calls = []
      const result = ensureDev({
        root,
        workspace: join(root, 'packages', 'ElectronAdmin'),
        runner: (cmd, args, cwd) => {
          calls.push({ cmd, args, cwd })
          return { status: 0 }
        },
        log: () => {}
      })
      expect(result.steps).toEqual(['electron', 'engines', 'migrate'])
      expect(calls).toHaveLength(3)
      expect(calls[0]?.args[0]).toContain('install.js')
      expect(calls[1]?.args).toEqual(['run', 'build:engines'])
      expect(calls[2]?.args[0]).toContain('migrate.mjs')
    })
  })
})

describe('ensureDev install path', () => {
  it('includes npm install when node_modules is missing', () => {
    withTempRoot('weaver-ensure-install-', (root) => {
      writeFileSync(join(root, 'package-lock.json'), '{}')
      mkdirSync(join(root, 'packages', 'ElectronAdmin', 'node_modules', 'electron'), {
        recursive: true
      })
      writeFileSync(
        join(root, 'packages', 'ElectronAdmin', 'node_modules', 'electron', 'install.js'),
        ''
      )
      const calls = []
      const result = ensureDev({
        root,
        workspace: join(root, 'packages', 'ElectronAdmin'),
        runner: (cmd, args) => {
          calls.push({ cmd, args })
          if (cmd === 'npm' && args[0] === 'install') {
            mkdirSync(join(root, 'node_modules'), { recursive: true })
          }
          return { status: 0 }
        },
        log: () => {}
      })
      expect(result.steps[0]).toBe('install')
      expect(calls[0]).toEqual({ cmd: 'npm', args: ['install'] })
    })
  })
})

describe('ensureDev errors', () => {
  it('throws when electron install.js cannot be resolved', () => {
    withTempRoot('weaver-ensure-no-el-', (root) => {
      mkdirSync(join(root, 'node_modules'), { recursive: true })
      writeFileSync(join(root, 'package-lock.json'), '{}')
      expect(() =>
        ensureDev({
          root,
          workspace: join(root, 'packages', 'ElectronAdmin'),
          runner: () => ({ status: 0 }),
          log: () => {}
        })
      ).toThrow(/electron package not found/)
    })
  })
})
