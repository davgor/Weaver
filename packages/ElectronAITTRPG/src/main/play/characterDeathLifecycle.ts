import type {
  CharacterAutosaveSnapshot,
  CharacterDeathResolution,
  CharacterProgression,
  CharacterStats,
  ResolveCharacterDeathInput,
  RespawnConfig
} from '@weaver/character-engine'
import type { ResolveTurnResult } from '@weaver/dm-engine'
import type { PlayDeathOutcome } from '../../shared/play/types.js'

export type PlayCharacterLifecyclePorts = {
  getCharacterStats: (characterId: string) => CharacterStats | undefined
  getCharacterProgression: (characterId: string) => CharacterProgression
  recordAutosaveSnapshot: (
    characterId: string,
    snapshot: CharacterAutosaveSnapshot
  ) => CharacterAutosaveSnapshot
  resolveCharacterDeath: (input: ResolveCharacterDeathInput) => Promise<CharacterDeathResolution>
}

export type PlayCharacterLifecycleDeps = {
  character?: PlayCharacterLifecyclePorts
  now: () => string
  respawnConfig: RespawnConfig
}

export type HandleCharacterLifecycleInput = {
  campaignId: string
  characterId: string
  result: ResolveTurnResult
  deps: PlayCharacterLifecycleDeps
}

export async function handleCharacterLifecycle(
  input: HandleCharacterLifecycleInput
): Promise<PlayDeathOutcome | null> {
  const character = input.deps.character
  if (character === undefined) return null
  const stats = character.getCharacterStats(input.characterId)
  const cause = resolveDeathCause(input.result, input.characterId, stats)
  if (cause !== null) {
    const resolution = await character.resolveCharacterDeath({
      campaignId: input.campaignId,
      characterId: input.characterId,
      cause,
      respawnConfig: input.deps.respawnConfig
    })
    return toPlayDeathOutcome(resolution)
  }
  recordAutosave(character, input.characterId, stats, input.deps.now())
  return null
}

function recordAutosave(
  character: PlayCharacterLifecyclePorts,
  characterId: string,
  stats: CharacterStats | undefined,
  recordedAt: string
): void {
  if (stats === undefined) return
  character.recordAutosaveSnapshot(characterId, {
    stats,
    progression: character.getCharacterProgression(characterId),
    recordedAt
  })
}

function resolveDeathCause(
  result: ResolveTurnResult,
  characterId: string,
  stats: CharacterStats | undefined
): string | null {
  if (hasCombatZeroHp(result, characterId)) return 'Hit points reached 0'
  if (stats === undefined || stats.currentHp > 0) return null
  if ((stats.dying?.failures ?? 0) >= 3) return 'Death saving throws failed'
  return 'Hit points reached 0'
}

function hasCombatZeroHp(result: ResolveTurnResult, characterId: string): boolean {
  if (result.resolution.kind !== 'combat') return false
  return result.resolution.encounter.combatants.some((combatant) => {
    const hp = combatant.hp
    return (
      combatant.kind === 'character' &&
      combatant.id === characterId &&
      hp !== undefined &&
      hp.current <= 0
    )
  })
}

function toPlayDeathOutcome(resolution: CharacterDeathResolution): PlayDeathOutcome {
  if (resolution.status === 'dead') {
    return {
      mode: resolution.mode,
      status: 'dead',
      cause: resolution.cause ?? 'Character death resolved',
      obituary: resolution.obituary ?? ''
    }
  }
  if (resolution.mode === 'standard' && resolution.restoredFromAutosave === true) {
    return {
      mode: 'standard',
      status: 'alive',
      restoredFromAutosave: true
    }
  }
  if (resolution.mode === 'respawn' && resolution.respawn !== undefined) {
    return {
      mode: 'respawn',
      status: 'alive',
      respawn: { ...resolution.respawn }
    }
  }
  return {
    mode: resolution.mode,
    status: 'dead',
    cause: resolution.cause ?? 'Character death resolved',
    obituary: resolution.obituary ?? ''
  }
}
