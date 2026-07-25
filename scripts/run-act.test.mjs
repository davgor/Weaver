import { describe, expect, it } from 'vitest'
import { buildActArgs, isDockerAvailable, resolveActBinary } from './run-act.mjs'

describe('resolveActBinary', () => {
  it('prefers an ACT_BIN env override over everything else', () => {
    const bin = resolveActBinary({
      env: { ACT_BIN: '/custom/act' },
      which: () => false,
      existsSyncFn: () => true
    })
    expect(bin).toBe('/custom/act')
  })

  it('uses "act" when it resolves on PATH', () => {
    const bin = resolveActBinary({ env: {}, which: () => true, existsSyncFn: () => false })
    expect(bin).toBe('act')
  })

  it('falls back to the known WinGet install path when present on disk', () => {
    const bin = resolveActBinary({ env: {}, which: () => false, existsSyncFn: () => true })
    expect(bin).toMatch(/act\.exe$/)
  })

  it('returns null when act cannot be found anywhere', () => {
    const bin = resolveActBinary({ env: {}, which: () => false, existsSyncFn: () => false })
    expect(bin).toBeNull()
  })
})

describe('buildActArgs', () => {
  it('builds the pull_request invocation with the workflow-specific platform mapping', () => {
    const args = buildActArgs({
      file: '.github/workflows/pr-checks.yml',
      platform: 'windows-latest=catthehacker/ubuntu:act-latest'
    })
    expect(args).toEqual([
      'pull_request',
      '-W',
      '.github/workflows/pr-checks.yml',
      '-P',
      'windows-latest=catthehacker/ubuntu:act-latest',
      '--container-architecture',
      'linux/amd64',
      '--pull=false'
    ])
  })
})

describe('isDockerAvailable', () => {
  it('returns true when `docker info` exits 0', () => {
    expect(isDockerAvailable(() => ({ status: 0 }))).toBe(true)
  })

  it('returns false when `docker info` exits non-zero or errors', () => {
    expect(isDockerAvailable(() => ({ status: 1 }))).toBe(false)
  })
})
