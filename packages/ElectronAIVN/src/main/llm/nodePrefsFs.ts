import { access, readFile, writeFile } from 'node:fs/promises'
import type { PrefsFs } from './backendPreferenceStore.js'

export function createNodePrefsFs(): PrefsFs {
  return {
    exists: async (path) => {
      try {
        await access(path)
        return true
      } catch {
        return false
      }
    },
    readText: (path) => readFile(path, 'utf8'),
    writeText: (path, contents) => writeFile(path, contents, 'utf8')
  }
}
