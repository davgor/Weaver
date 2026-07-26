import type { RegionMutation, RegionRecord } from '@weaver/regional-engine'
import type {
  CivilizationRecord,
  SettlementMutation
} from '@weaver/civilization-engine'
import type { NpcRecord, NpcWorldMutation } from '@weaver/npc-engine'

export type RegionWorldMutation = {
  target: 'region'
  worldId: string
  regionId: string
  mutation: RegionMutation
}

export type SettlementWorldMutation = {
  target: 'settlement'
  worldId: string
  civilizationId: string
  mutation: SettlementMutation
}

export type NpcWorldMutationRequest = {
  target: 'npc'
  npcId: string
  mutation: NpcWorldMutation
}

export type WorldMutation =
  | RegionWorldMutation
  | SettlementWorldMutation
  | NpcWorldMutationRequest

export type WorldMutationResult = RegionRecord | CivilizationRecord | NpcRecord | unknown

export type WorldMutationDeps = {
  regional: {
    applyRegionMutation: (
      worldId: string,
      regionId: string,
      mutation: RegionMutation
    ) => WorldMutationResult
  }
  civilization: {
    applySettlementMutation: (
      worldId: string,
      civilizationId: string,
      mutation: SettlementMutation
    ) => WorldMutationResult
  }
  npc: {
    applyNpcWorldMutation: (npcId: string, mutation: NpcWorldMutation) => WorldMutationResult
  }
}
