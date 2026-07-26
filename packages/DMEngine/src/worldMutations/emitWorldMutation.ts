import type { WorldMutation, WorldMutationDeps, WorldMutationResult } from './types.js'

export function emitWorldMutation(
  mutation: WorldMutation,
  deps: WorldMutationDeps
): WorldMutationResult {
  if (mutation.target === 'region') {
    return deps.regional.applyRegionMutation(
      mutation.worldId,
      mutation.regionId,
      mutation.mutation
    )
  }
  if (mutation.target === 'settlement') {
    return deps.civilization.applySettlementMutation(
      mutation.worldId,
      mutation.civilizationId,
      mutation.mutation
    )
  }
  return deps.npc.applyNpcWorldMutation(mutation.npcId, mutation.mutation)
}
