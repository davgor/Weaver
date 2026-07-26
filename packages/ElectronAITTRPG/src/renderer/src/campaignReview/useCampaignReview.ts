import { useCallback, useEffect, useState } from 'react'
import type {
  CampaignReviewSection,
  CampaignReviewSnapshot,
  GenerateRegionNpcRequest
} from '../../../shared/campaignCreate/types'
import { canEnterOnboarding } from '../campaignCreate/reviewGate'

type CampaignReviewState = {
  snapshot: CampaignReviewSnapshot | null
  busy: boolean
  error: string | null
}

export function useCampaignReview(active: boolean) {
  const [state, setState] = useState<CampaignReviewState>(emptyState())

  useEffect(() => {
    if (!active) return
    return beginReviewLoad(setState)
  }, [active])

  const updateField = useCallback(
    async (section: CampaignReviewSection, field: string, value: string, entityId?: string) => {
      await runReviewMutation(setState, () =>
        window.aiTtrpg.campaignCreate.updateReviewField({ section, field, value, entityId })
      )
    },
    []
  )

  const regenerateSection = useCallback(async (section: CampaignReviewSection) => {
    await runReviewMutation(setState, () =>
      window.aiTtrpg.campaignCreate.regenerateSection({ section })
    )
  }, [])

  const generateRegionNpc = useCallback(async (request: GenerateRegionNpcRequest) => {
    await runReviewMutation(setState, () =>
      window.aiTtrpg.campaignCreate.generateRegionNpc(request)
    )
  }, [])

  const confirmReview = useCallback(async () => {
    await runReviewMutation(setState, () => window.aiTtrpg.campaignCreate.confirmReview())
  }, [])

  const canContinue = canEnterOnboarding(state.snapshot?.confirmed ?? false)

  return {
    snapshot: state.snapshot,
    busy: state.busy,
    error: state.error,
    canContinue,
    updateField,
    regenerateSection,
    generateRegionNpc,
    confirmReview
  }
}

function emptyState(): CampaignReviewState {
  return { snapshot: null, busy: false, error: null }
}

function beginReviewLoad(
  setState: (value: CampaignReviewState | ((current: CampaignReviewState) => CampaignReviewState)) => void
): () => void {
  let cancelled = false
  setState((current) => ({ ...current, busy: true, error: null }))
  void window.aiTtrpg.campaignCreate
    .getReview()
    .then((snapshot) => {
      if (cancelled) return
      setState({ snapshot, busy: false, error: null })
    })
    .catch((error: unknown) => {
      if (cancelled) return
      setState({
        snapshot: null,
        busy: false,
        error: error instanceof Error ? error.message : 'Unable to load campaign review.'
      })
    })
  return () => {
    cancelled = true
  }
}

async function runReviewMutation(
  setState: (value: CampaignReviewState | ((current: CampaignReviewState) => CampaignReviewState)) => void,
  action: () => Promise<CampaignReviewSnapshot>
): Promise<CampaignReviewSnapshot | null> {
  setState((current) => ({ ...current, busy: true, error: null }))
  try {
    const snapshot = await action()
    setState({ snapshot, busy: false, error: null })
    return snapshot
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Campaign review request failed.'
    setState((current) => ({ ...current, busy: false, error: message }))
    return null
  }
}
