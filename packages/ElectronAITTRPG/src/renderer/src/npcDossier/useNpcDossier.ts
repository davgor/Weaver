import { useEffect, useState } from 'react'
import type {
  LoadNpcDossierRequest,
  NpcDossierSnapshot,
  NpcRelationshipSnapshot
} from '../../../shared/npcDossier/types'

export function useNpcDossier(open: boolean, request: LoadNpcDossierRequest | null) {
  const [dossier, setDossier] = useState<NpcDossierSnapshot | null>(null)
  const [relationship, setRelationship] = useState<NpcRelationshipSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const setters = { setDossier, setRelationship, setError }

  useEffect(() => {
    if (!open || request === null) return
    return beginDossierLoad(request, setters)
  }, [open, request?.campaignId, request?.npcId])

  return { dossier, relationship, error }
}

function beginDossierLoad(
  request: LoadNpcDossierRequest,
  setters: {
    setDossier: (dossier: NpcDossierSnapshot | null) => void
    setRelationship: (relationship: NpcRelationshipSnapshot | null) => void
    setError: (error: string | null) => void
  }
): () => void {
  let cancelled = false
  setters.setError(null)
  setters.setDossier(null)
  setters.setRelationship(null)
  void Promise.all([
    window.aiTtrpg.npcDossier.load(request),
    window.aiTtrpg.npcDossier.opinions({ npcId: request.npcId })
  ])
    .then(([nextDossier, nextRelationship]) => {
      if (cancelled) return
      setters.setDossier(nextDossier)
      setters.setRelationship(nextRelationship)
    })
    .catch((err: unknown) => {
      if (!cancelled) setters.setError(errorMessage(err))
    })
  return () => {
    cancelled = true
  }
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'NPC dossier request failed'
}
