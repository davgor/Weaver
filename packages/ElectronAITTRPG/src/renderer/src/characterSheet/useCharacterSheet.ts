import { useEffect, useState } from 'react'
import type { EquipmentSlot } from '@weaver/item-engine'
import type {
  CharacterSheetSnapshot,
  CharacterSheetTab,
  LoadCharacterSheetRequest
} from '../../../shared/characterSheet/types'

export function useCharacterSheet(open: boolean, request: LoadCharacterSheetRequest) {
  const [tab, setTab] = useState<CharacterSheetTab>('stats')
  const [sheet, setSheet] = useState<CharacterSheetSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    return beginSheetLoad(request, setSheet, setError)
  }, [open, request.characterId, request.characterName])

  return {
    tab,
    setTab,
    sheet,
    busy,
    error,
    equip: (instanceId: string, slot: EquipmentSlot) =>
      runSheetMutation(setSheet, setBusy, setError, () =>
        window.aiTtrpg.characterSheet.equip({
          characterId: request.characterId,
          instanceId,
          slot
        })
      ),
    unequip: (target: string) =>
      runSheetMutation(setSheet, setBusy, setError, () =>
        window.aiTtrpg.characterSheet.unequip({
          characterId: request.characterId,
          target
        })
      )
  }
}

function beginSheetLoad(
  request: LoadCharacterSheetRequest,
  setSheet: (sheet: CharacterSheetSnapshot | null) => void,
  setError: (error: string | null) => void
): () => void {
  let cancelled = false
  setError(null)
  void window.aiTtrpg.characterSheet
    .load(request)
    .then((next) => {
      if (!cancelled) setSheet(next)
    })
    .catch((err: unknown) => {
      if (!cancelled) setError(errorMessage(err))
    })
  return () => {
    cancelled = true
  }
}

async function runSheetMutation(
  setSheet: (sheet: CharacterSheetSnapshot | null) => void,
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void,
  run: () => Promise<CharacterSheetSnapshot>
): Promise<void> {
  setBusy(true)
  setError(null)
  try {
    setSheet(await run())
  } catch (err) {
    setError(errorMessage(err))
  } finally {
    setBusy(false)
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Character sheet request failed'
}
