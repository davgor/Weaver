/**
 * Electron package postinstall helper.
 *
 * `npm-ci-with-retry` sets ELECTRON_SKIP_BINARY_DOWNLOAD=1 so Windows CI can
 * finish `npm ci` without racing Electron's Chromium extract. Jobs that need
 * the binary re-run `node node_modules/electron/install.js` explicitly.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

if (process.env.ELECTRON_SKIP_BINARY_DOWNLOAD === '1') {
  process.exit(0)
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const installJs = join(root, 'node_modules', 'electron', 'install.js')
const result = spawnSync(process.execPath, [installJs], { stdio: 'inherit' })
process.exit(result.status ?? 1)
