export type LocalBackendPreference = 'vulkan' | 'cpu'

export type PrefsFs = {
  readText: (path: string) => Promise<string>
  writeText: (path: string, contents: string) => Promise<void>
  exists: (path: string) => Promise<boolean>
}

type StoredPrefs = {
  backend: LocalBackendPreference | null
  firstRunDismissed: boolean
}

const EMPTY_PREFS: StoredPrefs = { backend: null, firstRunDismissed: false }

export async function readBackendPreference(
  fs: PrefsFs,
  filePath: string
): Promise<LocalBackendPreference | null> {
  const prefs = await readPrefs(fs, filePath)
  return prefs.backend
}

export async function writeBackendPreference(
  fs: PrefsFs,
  filePath: string,
  backend: LocalBackendPreference
): Promise<void> {
  const prefs = await readPrefs(fs, filePath)
  await writePrefs(fs, filePath, { ...prefs, backend })
}

export async function readFirstRunDismissed(fs: PrefsFs, filePath: string): Promise<boolean> {
  const prefs = await readPrefs(fs, filePath)
  return prefs.firstRunDismissed
}

export async function writeFirstRunDismissed(
  fs: PrefsFs,
  filePath: string,
  dismissed: boolean
): Promise<void> {
  const prefs = await readPrefs(fs, filePath)
  await writePrefs(fs, filePath, { ...prefs, firstRunDismissed: dismissed })
}

export function createMemoryPrefsFs(seed: Record<string, string> = {}): PrefsFs {
  const files = new Map<string, string>(Object.entries(seed))
  return {
    exists: async (path) => files.has(path),
    readText: async (path) => {
      const value = files.get(path)
      if (value === undefined) throw new Error(`Missing prefs file: ${path}`)
      return value
    },
    writeText: async (path, contents) => {
      files.set(path, contents)
    }
  }
}

async function readPrefs(fs: PrefsFs, filePath: string): Promise<StoredPrefs> {
  if (!(await fs.exists(filePath))) return { ...EMPTY_PREFS }
  try {
    return parsePrefs(await fs.readText(filePath))
  } catch {
    return { ...EMPTY_PREFS }
  }
}

async function writePrefs(fs: PrefsFs, filePath: string, prefs: StoredPrefs): Promise<void> {
  await fs.writeText(filePath, JSON.stringify(prefs))
}

function parsePrefs(raw: string): StoredPrefs {
  const parsed: unknown = JSON.parse(raw)
  if (!isRecord(parsed)) return { ...EMPTY_PREFS }
  return {
    backend: parseBackend(parsed.backend),
    firstRunDismissed: parsed.firstRunDismissed === true
  }
}

function parseBackend(value: unknown): LocalBackendPreference | null {
  if (value === 'vulkan' || value === 'cpu') return value
  return null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
