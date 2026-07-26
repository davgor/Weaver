import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { EncounterState, EncounterStore, EncounterStoreOptions } from './types.js'

const ENCOUNTER_DIR = ['combat', 'encounters'] as const

export function createJsonEncounterStore(options: EncounterStoreOptions): EncounterStore {
  const root = options.dataRoot
  return {
    saveEncounter(encounter) {
      const filePath = encounterFilePath(root, encounter.encounterId)
      mkdirSync(join(root, ...ENCOUNTER_DIR), { recursive: true })
      writeFileSync(filePath, `${JSON.stringify(encounter, null, 2)}\n`, 'utf8')
      return clone(encounter)
    },
    getEncounter(encounterId) {
      const filePath = encounterFilePath(root, encounterId)
      if (!existsSync(filePath)) {
        return undefined
      }
      return parseEncounter(readFileSync(filePath, 'utf8'))
    }
  }
}

export function createMemoryEncounterStore(): EncounterStore {
  const encounters = new Map<string, EncounterState>()
  return {
    saveEncounter(encounter) {
      encounters.set(encounter.encounterId, clone(encounter))
      return clone(encounter)
    },
    getEncounter(encounterId) {
      const encounter = encounters.get(encounterId)
      return encounter === undefined ? undefined : clone(encounter)
    }
  }
}

export function cloneEncounter(encounter: EncounterState): EncounterState {
  return clone(encounter)
}

function encounterFilePath(dataRoot: string, encounterId: string): string {
  return join(dataRoot, ...ENCOUNTER_DIR, `${safeFileName(encounterId)}.json`)
}

function safeFileName(encounterId: string): string {
  return encounterId.replace(/[^a-z0-9._-]+/gi, '_')
}

function parseEncounter(text: string): EncounterState {
  const parsed = JSON.parse(text) as Partial<EncounterState>
  if (typeof parsed.encounterId !== 'string') {
    throw new Error('Encounter store file is missing encounterId')
  }
  if (parsed.status !== 'active' && parsed.status !== 'resolved') {
    throw new Error('Encounter store file is not a valid encounter state')
  }
  if (parsed.startMode !== 'pre-authored' && parsed.startMode !== 'ad-hoc') {
    throw new Error('Encounter store file is missing startMode')
  }
  return parsed as EncounterState
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
