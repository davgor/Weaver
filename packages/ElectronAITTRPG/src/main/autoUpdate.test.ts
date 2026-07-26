import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const checkForUpdates = vi.fn()
const quitAndInstall = vi.fn()
const on = vi.fn()
const ipcHandle = vi.fn()
const send = vi.fn()
const loggerInfo = vi.fn()
const loggerError = vi.fn()

vi.mock('electron', () => ({
  app: {
    isPackaged: true,
    getVersion: () => '1.2.3'
  },
  BrowserWindow: {
    getAllWindows: () => [
      { isDestroyed: () => false, webContents: { send } },
      { isDestroyed: () => true, webContents: { send } }
    ]
  },
  ipcMain: {
    handle: (...args: unknown[]) => ipcHandle(...args)
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
    info: (...args: unknown[]) => loggerInfo(...args),
    error: (...args: unknown[]) => loggerError(...args)
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

function captureUpdaterHandlers(): Map<string, (...args: never[]) => void> {
  const handlers = new Map<string, (...args: never[]) => void>()
  on.mockImplementation((event: string, fn: (...args: never[]) => void) => {
    handlers.set(event, fn)
  })
  return handlers
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

describe('checkForUpdatesNow', () => {
  beforeEach(resetAutoUpdateTest)
  afterEach(restoreAutoUpdateTest)

  it('returns disabled when auto-update is off', async () => {
    process.env['DISABLE_AUTO_UPDATE'] = '1'
    const { checkForUpdatesNow } = await loadModule()
    expect(await checkForUpdatesNow()).toEqual({ outcome: 'disabled' })
  })

  it('maps null / available / up-to-date / thrown provider results', async () => {
    const mod = await loadModule()
    checkForUpdates.mockResolvedValueOnce(null)
    expect(await mod.checkForUpdatesNow()).toEqual({
      outcome: 'error',
      message: 'No update response from provider'
    })

    checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable: true,
      updateInfo: { version: '2.0.0' }
    })
    expect(await mod.checkForUpdatesNow()).toEqual({
      outcome: 'update-available',
      version: '2.0.0'
    })

    checkForUpdates.mockResolvedValueOnce({
      isUpdateAvailable: false,
      updateInfo: { version: '1.2.3' }
    })
    expect(await mod.checkForUpdatesNow()).toEqual({ outcome: 'up-to-date' })

    checkForUpdates.mockRejectedValueOnce(new Error('network down'))
    expect(await mod.checkForUpdatesNow()).toEqual({
      outcome: 'error',
      message: 'network down'
    })
    expect(mod.getAutoUpdateState().phase).toBe('error')
  })
})

describe('updater events', () => {
  beforeEach(resetAutoUpdateTest)
  afterEach(restoreAutoUpdateTest)

  it('returns busy messages after updater events advance phase', async () => {
    const handlers = captureUpdaterHandlers()
    const mod = await loadModule()
    mod.initAutoUpdate()

    handlers.get('update-downloaded')?.({ version: '9.0.0' } as never)
    expect(await mod.checkForUpdatesNow()).toEqual({
      outcome: 'busy',
      message: 'An update is ready to install.'
    })

    handlers.get('update-available')?.({ version: '9.1.0' } as never)
    expect(await mod.checkForUpdatesNow()).toEqual({
      outcome: 'busy',
      message: 'An update is already downloading.'
    })

    handlers.get('checking-for-update')?.(undefined as never)
    expect(await mod.checkForUpdatesNow()).toEqual({ outcome: 'busy' })
  })

  it('wires remaining updater events and broadcasts to live windows', async () => {
    const handlers = captureUpdaterHandlers()
    const mod = await loadModule()
    mod.initAutoUpdate()

    handlers.get('download-progress')?.({ percent: 41.2 } as never)
    expect(mod.getAutoUpdateState()).toMatchObject({
      phase: 'downloading',
      downloadPercent: 41
    })

    handlers.get('update-not-available')?.(undefined as never)
    expect(mod.getAutoUpdateState().phase).toBe('idle')

    handlers.get('error')?.({ message: 'boom' } as never)
    expect(mod.getAutoUpdateState()).toMatchObject({ phase: 'error', message: 'boom' })
    expect(send).toHaveBeenCalled()
    expect(loggerError).toHaveBeenCalled()
  })
})

describe('IPC helpers', () => {
  beforeEach(resetAutoUpdateTest)
  afterEach(restoreAutoUpdateTest)

  it('registers IPC handlers and quitAndInstallUpdate', async () => {
    const mod = await loadModule()
    mod.registerAutoUpdateHandlers()
    expect(ipcHandle).toHaveBeenCalledWith('autoUpdate:getState', expect.any(Function))
    expect(ipcHandle).toHaveBeenCalledWith('autoUpdate:quitAndInstall', expect.any(Function))
    expect(ipcHandle).toHaveBeenCalledWith('autoUpdate:checkForUpdates', expect.any(Function))

    mod.quitAndInstallUpdate()
    expect(quitAndInstall).toHaveBeenCalledWith(true, true)
  })
})
