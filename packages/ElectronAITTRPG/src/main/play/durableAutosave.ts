import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getLatestAutosaveSnapshot,
  recordAutosaveSnapshot,
  type CharacterAutosaveSnapshot
} from '@weaver/character-engine'

const AUTOSAVE_DIR = 'autosaves'

export function writeDurableAutosave(
  dataRoot: string,
  characterId: string,
  snapshot: CharacterAutosaveSnapshot
): CharacterAutosaveSnapshot {
  const stored = recordAutosaveSnapshot(characterId, snapshot)
  const dir = join(dataRoot, AUTOSAVE_DIR)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, `${safeToken(characterId)}.json`), `${JSON.stringify(stored)}\n`, 'utf8')
  return stored
}

export function hydrateDurableAutosaves(dataRoot: string): void {
  const dir = join(dataRoot, AUTOSAVE_DIR)
  if (!existsSync(dir)) return
  for (const fileName of readdirSync(dir)) {
    if (!fileName.endsWith('.json')) continue
    const snapshot = JSON.parse(readFileSync(join(dir, fileName), 'utf8')) as CharacterAutosaveSnapshot
    const characterId = snapshot.stats.characterId
    if (getLatestAutosaveSnapshot(characterId) === undefined) {
      recordAutosaveSnapshot(characterId, snapshot)
    }
  }
}

function safeToken(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '_')
}
