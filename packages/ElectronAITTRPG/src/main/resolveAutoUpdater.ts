/**
 * electron-updater is CommonJS. Under Node ESM, named `autoUpdater` is missing;
 * it only appears on the default export (module.exports).
 */
type ElectronUpdaterModuleShape<T> = {
  default?: { autoUpdater?: T }
  autoUpdater?: T
}

export function resolveAutoUpdater<T>(mod: ElectronUpdaterModuleShape<T>): T {
  const updater = mod.default?.autoUpdater ?? mod.autoUpdater
  if (updater == null) {
    throw new Error('electron-updater autoUpdater export not found')
  }
  return updater
}
