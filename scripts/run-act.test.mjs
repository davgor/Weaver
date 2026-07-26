import { describe, expect, it } from 'vitest'
import { buildActArgs, isDockerAvailable, main, resolveActBinary } from './run-act.mjs'

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

const sampleWorkflow = {
  file: '.github/workflows/pr-checks.yml',
  platform: 'windows-latest=catthehacker/ubuntu:act-latest'
}

describe('main help and prerequisites', () => {
  it('prints help and exits 0', async () => {
    const logs = []
    const code = await main(['--help'], {
      log: (msg) => logs.push(msg),
      error: () => {}
    })
    expect(code).toBe(0)
    expect(logs.some((line) => line.includes('Usage: npm run ci:act'))).toBe(true)
  })

  it('fails when Docker is unavailable or act is missing', async () => {
    expect(
      await main([], {
        dockerAvailable: () => false,
        error: () => {},
        log: () => {}
      })
    ).toBe(1)

    expect(
      await main([], {
        dockerAvailable: () => true,
        resolveAct: () => null,
        error: () => {},
        log: () => {}
      })
    ).toBe(1)
  })
})

describe('main workflow runs', () => {
  it('runs workflows and stops on the first failure', async () => {
    const runs = []
    expect(
      await main([], {
        dockerAvailable: () => true,
        resolveAct: () => '/bin/act',
        workflows: [sampleWorkflow, { ...sampleWorkflow, file: 'second.yml' }],
        runAct: (bin, args) => {
          runs.push({ bin, args })
          return { status: runs.length === 1 ? 0 : 2 }
        },
        log: () => {},
        error: () => {}
      })
    ).toBe(1)
    expect(runs).toHaveLength(2)

    runs.length = 0
    expect(
      await main([], {
        dockerAvailable: () => true,
        resolveAct: () => '/bin/act',
        workflows: [sampleWorkflow],
        runAct: (bin, args) => {
          runs.push({ bin, args })
          return { status: 0 }
        },
        log: () => {},
        error: () => {}
      })
    ).toBe(0)
    expect(runs[0]?.bin).toBe('/bin/act')
  })
})
