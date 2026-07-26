import { useCallback, useState } from 'react'
import type { CampaignCreateDraft, CampaignReviewSnapshot } from '../../../shared/campaignCreate/types'
import {
  buildDefaultCampaignCreateDraft,
  validateCampaignCreateDraft
} from '../../../shared/campaignCreate/types'

type CampaignStartState = {
  draft: CampaignCreateDraft
  busy: boolean
  error: string | null
  review: CampaignReviewSnapshot | null
}

export function useCampaignStart() {
  const [state, setState] = useState<CampaignStartState>(initialState())

  const updateDraft = useCallback((patch: Partial<CampaignCreateDraft>) => {
    setState((current) => ({
      ...current,
      draft: { ...current.draft, ...patch },
      error: null
    }))
  }, [])

  const startGeneration = useCallback(async () => {
    setState((current) => ({ ...current, busy: true, error: null }))
    try {
      const draft = state.draft
      validateCampaignCreateDraft(draft)
      const review = await window.aiTtrpg.campaignCreate.startGeneration(draft)
      setState((current) => ({ ...current, busy: false, review }))
      return review
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start campaign generation.'
      setState((current) => ({ ...current, busy: false, error: message }))
      return null
    }
  }, [state.draft])

  const reset = useCallback(() => {
    setState(initialState())
  }, [])

  return {
    draft: state.draft,
    busy: state.busy,
    error: state.error,
    review: state.review,
    updateDraft,
    startGeneration,
    reset
  }
}

function initialState(): CampaignStartState {
  return {
    draft: buildDefaultCampaignCreateDraft(),
    busy: false,
    error: null,
    review: null
  }
}
