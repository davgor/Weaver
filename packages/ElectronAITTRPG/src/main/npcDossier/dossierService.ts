import { getNpcDossier, listNpcOpinionsHeldBy } from '@weaver/npc-engine'
import type {
  LoadNpcDossierRequest,
  NpcDossierSnapshot,
  NpcRelationshipSnapshot
} from '../../shared/npcDossier/types.js'
import { ensureDemoNpcDossierData } from './demoSeed.js'
import {
  createEnginePorts,
  loadNpcDossierSnapshot,
  loadNpcRelationshipSnapshot,
  type NpcDossierPorts
} from './loadDossier.js'

export type { NpcDossierPorts }

export function createLiveNpcDossierPorts(): NpcDossierPorts {
  return createEnginePorts({
    getNpcDossier,
    listNpcOpinionsHeldBy
  })
}

export function loadNpcDossier(
  ports: NpcDossierPorts,
  request: LoadNpcDossierRequest
): NpcDossierSnapshot {
  ensureDemoNpcDossierData(request.npcId)
  return loadNpcDossierSnapshot(ports, request)
}

export function loadNpcOpinions(
  ports: NpcDossierPorts,
  request: { npcId: string }
): NpcRelationshipSnapshot {
  ensureDemoNpcDossierData(request.npcId)
  return loadNpcRelationshipSnapshot(ports, request)
}
