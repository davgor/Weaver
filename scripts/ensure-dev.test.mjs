import { describe, expect, it } from 'vitest'
import { join } from 'node:path'
import {
  needsNpmInstall,
  planEnsureDevSteps,
  resolveElectronInstallScript
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
})

describe('resolveWorkspaceFromArgv', () => {
  it('defaults to ElectronAdmin when no flag is set', async () => {
    const { resolveWorkspaceFromArgv } = await import('./ensure-dev.mjs')
    expect(resolveWorkspaceFromArgv(['node', 'ensure-dev.mjs'], join('repo'))).toBe(
      join('repo', 'packages', 'ElectronAdmin')
    )
  })

  it('honors --workspace for AI-TTRPG bootstrap', async () => {
    const { resolveWorkspaceFromArgv } = await import('./ensure-dev.mjs')
    expect(
      resolveWorkspaceFromArgv(
        ['node', 'ensure-dev.mjs', '--workspace=packages/ElectronAITTRPG'],
        join('repo')
      )
    ).toBe(join('repo', 'packages', 'ElectronAITTRPG'))
  })
})
