import { readFileSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

/**
 * @param {string} pkgPath
 */
function nextMinorVersion(pkgPath) {
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const parts = String(pkg.version).split('.').map((part) => Number.parseInt(part, 10))
  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    throw new Error(`Invalid semver in ${pkgPath}: ${pkg.version}`)
  }
  const [major, minor] = parts
  return { pkg, nextVersion: `${major}.${minor + 1}.0` }
}

/**
 * @param {string} electronPkgPath
 * @param {string} nextVersion
 */
function bumpElectronPackage(electronPkgPath, nextVersion) {
  try {
    const electronPkg = JSON.parse(readFileSync(electronPkgPath, 'utf8'))
    electronPkg.version = nextVersion
    writeFileSync(electronPkgPath, `${JSON.stringify(electronPkg, null, 2)}\n`)
  } catch {
    // electron package may be absent in some environments
  }
}

/**
 * @param {string} lockPath
 * @param {string} nextVersion
 * @param {string[]} electronLockKeys
 */
function bumpLockfile(lockPath, nextVersion, electronLockKeys) {
  try {
    const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
    lock.version = nextVersion
    if (lock.packages?.['']) lock.packages[''].version = nextVersion
    for (const key of electronLockKeys) {
      if (lock.packages?.[key]) {
        lock.packages[key].version = nextVersion
      }
    }
    writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`)
  } catch {
    // package-lock may be absent in some environments
  }
}

const DEFAULT_ELECTRON_PACKAGES = [
  'packages/ElectronAITTRPG/package.json',
  'packages/ElectronAdmin/package.json'
]

const DEFAULT_LOCK_KEYS = ['packages/ElectronAITTRPG', 'packages/ElectronAdmin']

/**
 * Bumps root + both Electron app minor versions (x.Y.0) and syncs package-lock.json.
 * Prints the new version to stdout for CI.
 */
export function bumpMinorVersion(
  pkgPath = 'package.json',
  lockPath = 'package-lock.json',
  ...electronPkgPaths
) {
  const targets = electronPkgPaths.length > 0 ? electronPkgPaths : DEFAULT_ELECTRON_PACKAGES
  const { pkg, nextVersion } = nextMinorVersion(pkgPath)
  pkg.version = nextVersion
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  for (const electronPkgPath of targets) {
    bumpElectronPackage(electronPkgPath, nextVersion)
  }
  bumpLockfile(lockPath, nextVersion, DEFAULT_LOCK_KEYS)
  return nextVersion
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isCli) {
  process.stdout.write(bumpMinorVersion())
}
