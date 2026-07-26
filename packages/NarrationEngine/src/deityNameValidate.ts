export type DeityNameValidation =
  | { ok: true; name: string }
  | { ok: false; reason: string }

export type ResolvedDeityName =
  | { name: string; fellBack: false }
  | { name: string; fellBack: true; reason: string }

const SAFE_DEITY_NAMES = ['The Unnamed', 'The Hidden Flame', 'The Quiet Watcher'] as const
const HYPHENATED_EPITHET = /\b\w+-\w+\b/

export function validateDeityName(name: string): DeityNameValidation {
  const trimmed = name.trim()
  if (trimmed.length === 0) {
    return { ok: false, reason: 'Deity name is required' }
  }
  if (HYPHENATED_EPITHET.test(trimmed)) {
    return { ok: false, reason: 'Deity names must not use hyphenated epithets' }
  }
  return { ok: true, name: trimmed }
}

export function deityNameFallback(index = 0): string {
  return SAFE_DEITY_NAMES[index % SAFE_DEITY_NAMES.length] ?? SAFE_DEITY_NAMES[0]
}

export function resolveDeityName(name: string, attempt = 0): ResolvedDeityName {
  const validation = validateDeityName(name)
  if (validation.ok) {
    return { name: validation.name, fellBack: false }
  }
  return {
    name: deityNameFallback(attempt),
    fellBack: true,
    reason: validation.reason
  }
}
