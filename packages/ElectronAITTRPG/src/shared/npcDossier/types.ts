import type { NpcDossier, NpcOpinion } from '@weaver/npc-engine'

export type LoadNpcDossierRequest = {
  campaignId: string
  npcId: string
}

export type NpcDossierSnapshot = NpcDossier

export type NpcRelationshipSnapshot = {
  holderNpcId: string
  opinions: NpcOpinion[]
}

export type NpcDossierApi = {
  load: (request: LoadNpcDossierRequest) => Promise<NpcDossierSnapshot>
  opinions: (request: { npcId: string }) => Promise<NpcRelationshipSnapshot>
}
