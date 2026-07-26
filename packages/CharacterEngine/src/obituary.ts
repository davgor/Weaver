import { CharacterEngineError } from './errors.js'

export type ObituaryDrafterInput = {
  characterId: string
  campaignId: string
  cause: string
}

/** Injected dependency that drafts obituary prose; CharacterEngine stores the result only. */
export type ObituaryDrafter = (input: ObituaryDrafterInput) => string | Promise<string>

let injectedDrafter: ObituaryDrafter | undefined

export function setObituaryDrafter(drafter: ObituaryDrafter | undefined): void {
  injectedDrafter = drafter
}

export async function resolveObituaryText(
  input: ObituaryDrafterInput,
  draft?: string
): Promise<string> {
  if (draft !== undefined && draft.trim().length > 0) {
    return draft
  }
  if (injectedDrafter === undefined) {
    throw new CharacterEngineError(
      'OBITUARY_REQUIRED',
      'Legendary death requires obituaryDraft or an injected obituary drafter'
    )
  }
  const text = await injectedDrafter(input)
  if (text.trim().length === 0) {
    throw new CharacterEngineError('OBITUARY_REQUIRED', 'Obituary drafter returned empty text')
  }
  return text
}
