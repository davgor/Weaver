/**
 * Run package / app migrations before boot.
 * Currently a no-op placeholder — extend when engines introduce persisted schema.
 */
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

/**
 * @param {{ log?: (msg: string) => void }} [options]
 */
export function runMigrations(options = {}) {
  const log = options.log ?? console.log
  log('migrate: no pending migrations')
  return { applied: [] }
}

const isCli =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href

if (isCli) {
  runMigrations()
}
