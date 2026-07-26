import type { NpcDossier, NpcOpinion } from '@weaver/npc-engine'
import type {
  LoadNpcDossierRequest,
  NpcRelationshipSnapshot
} from '../../shared/npcDossier/types.js'

export type NpcDossierPorts = {
  getNpcDossier: (request: LoadNpcDossierRequest) => NpcDossier
  listNpcOpinionsHeldBy: (npcId: string) => NpcOpinion[]
}

export function createEnginePorts(deps: {
  getNpcDossier: NpcDossierPorts['getNpcDossier']
  listNpcOpinionsHeldBy: NpcDossierPorts['listNpcOpinionsHeldBy']
}): NpcDossierPorts {
  return { ...deps }
}

export function loadNpcDossierSnapshot(
  ports: NpcDossierPorts,
  request: LoadNpcDossierRequest
): NpcDossier {
  return ports.getNpcDossier(request)
}

export function loadNpcRelationshipSnapshot(
  ports: NpcDossierPorts,
  request: { npcId: string }
): NpcRelationshipSnapshot {
  return {
    holderNpcId: request.npcId,
    opinions: ports.listNpcOpinionsHeldBy(request.npcId)
  }
}
