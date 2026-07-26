import { type FormEvent } from 'react'
import type { CampaignCreateDraft, DeathMode } from '../../../shared/campaignCreate/types'
import {
  buildDefaultCampaignCreateDraft,
  deathModeOptions
} from '../../../shared/campaignCreate/types'
import { CampaignStartForm } from './CampaignStartForm'
import { useCampaignStart } from './useCampaignStart'

type CampaignStartModalProps = {
  open: boolean
  onClose: () => void
  onReviewReady: () => void
}

export function CampaignStartModal({
  open,
  onClose,
  onReviewReady
}: CampaignStartModalProps): JSX.Element | null {
  const { draft, busy, error, updateDraft, startGeneration } = useCampaignStart()

  if (!open) return null

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault()
    const review = await startGeneration()
    if (review?.status === 'ready') onReviewReady()
  }

  return (
    <div className="modal-overlay campaign-start-overlay" role="dialog" aria-modal="true">
      <section className="modal-panel campaign-start-panel" aria-label="Create campaign">
        <CampaignStartHeader onClose={onClose} busy={busy} />
        <CampaignStartForm
          draft={draft}
          busy={busy}
          error={error}
          onClose={onClose}
          onUpdate={updateDraft}
          onSubmit={(event) => void submit(event)}
        />
      </section>
    </div>
  )
}

function CampaignStartHeader({
  onClose,
  busy
}: {
  onClose: () => void
  busy: boolean
}): JSX.Element {
  return (
    <header className="campaign-start-header">
      <div>
        <p className="eyebrow">New campaign</p>
        <h1>Create your world</h1>
      </div>
      <button type="button" className="campaign-start-close" onClick={onClose} disabled={busy}>
        Close
      </button>
    </header>
  )
}

export function defaultCampaignStartDraft(): CampaignCreateDraft {
  return buildDefaultCampaignCreateDraft()
}

export function isDeathModeChoice(value: string): value is DeathMode {
  return deathModeOptions.some((option) => option.id === value)
}
