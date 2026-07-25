import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const checkForUpdates = vi.fn()
const quitAndInstall = vi.fn()
const on = vi.fn()

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '1.2.3'
  },
  BrowserWindow: {
    getAllWindows: () => []
  },
  ipcMain: {
    handle: vi.fn()
  }
}))

vi.mock('electron-updater', () => {
  const autoUpdater = {
    checkForUpdates,
    quitAndInstall,
    on,
    logger: undefined,
    autoDownload: false,
    autoInstallOnAppQuit: false
  }
  return {
    autoUpdater,
    default: { autoUpdater }
  }
})

vi.mock('./logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}))

async function loadModule(): Promise<typeof import('./autoUpdate.js')> {
  return import('./autoUpdate.js')
}

function resetAutoUpdateTest(): void {
  vi.resetModules()
  vi.clearAllMocks()
  vi.useFakeTimers()
  checkForUpdates.mockResolvedValue(undefined)
  delete process.env['DISABLE_AUTO_UPDATE']
}

function restoreAutoUpdateTest(): void {
  vi.useRealTimers()
  delete process.env['DISABLE_AUTO_UPDATE']
}

describe('canStartUpdateCheck', () => {
  beforeEach(resetAutoUpdateTest)
  afterEach(restoreAutoUpdateTest)

  it('is false while busy or already downloaded', async () => {
    const { canStartUpdateCheck } = await loadModule()
    expect(canStartUpdateCheck('idle')).toBe(true)
    expect(canStartUpdateCheck('error')).toBe(true)
    expect(canStartUpdateCheck('checking')).toBe(false)
    expect(canStartUpdateCheck('available')).toBe(false)
    expect(canStartUpdateCheck('downloading')).toBe(false)
    expect(canStartUpdateCheck('downloaded')).toBe(false)
  })
})

describe('formatUpdateReadyMessage', () => {
  beforeEach(resetAutoUpdateTest)
  afterEach(restoreAutoUpdateTest)

  it('returns restart copy for any version', async () => {
    const { formatUpdateReadyMessage } = await loadModule()
    expect(formatUpdateReadyMessage('9.9.9')).toBe('Restart and update')
  })
})

describe('initAutoUpdate scheduling', () => {
  beforeEach(resetAutoUpdateTest)
  afterEach(restoreAutoUpdateTest)

  it('schedules an initial check then recurring polls', async () => {
    const { initAutoUpdate, INITIAL_CHECK_DELAY_MS, POLL_INTERVAL_MS } = await loadModule()
    initAutoUpdate()

    expect(checkForUpdates).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(INITIAL_CHECK_DELAY_MS)
    expect(checkForUpdates).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS)
    expect(checkForUpdates).toHaveBeenCalledTimes(2)
  })

  it('does not schedule when DISABLE_AUTO_UPDATE=1', async () => {
    process.env['DISABLE_AUTO_UPDATE'] = '1'
    const { initAutoUpdate } = await loadModule()
    initAutoUpdate()
    await vi.advanceTimersByTimeAsync(60_000)
    expect(checkForUpdates).not.toHaveBeenCalled()
  })
})
