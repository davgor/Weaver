import { useCampaignReview } from './useCampaignReview'
import { ReviewBody } from './reviewSections'

type CampaignReviewScreenProps = {
  open: boolean
  onContinue: () => void
  onBack: () => void
}

export function CampaignReviewScreen({
  open,
  onContinue,
  onBack
}: CampaignReviewScreenProps): JSX.Element | null {
  const review = useCampaignReview(open)

  if (!open) return null

  const snapshot = review.snapshot
  const ready = snapshot?.status === 'ready'

  return (
    <div className="modal-overlay campaign-review-overlay" role="dialog" aria-modal="true">
      <section className="modal-panel campaign-review-panel" aria-label="Review campaign">
        <header className="campaign-review-header">
          <div>
            <p className="eyebrow">Campaign review</p>
            <h1>{snapshot?.campaignName ?? 'Review generated world'}</h1>
          </div>
          <button type="button" onClick={onBack} disabled={review.busy}>
            Back
          </button>
        </header>
        {snapshot === null ? (
          <p className="campaign-review-loading">Loading review…</p>
        ) : (
          <ReviewBody snapshot={snapshot} review={review} ready={ready} />
        )}
        <footer className="campaign-review-actions">
          {review.error !== null ? <p className="campaign-error">{review.error}</p> : null}
          <button
            type="button"
            disabled={!review.canContinue || review.busy}
            onClick={() => void continueWhenConfirmed(onContinue)}
          >
            Continue to onboarding
          </button>
        </footer>
      </section>
    </div>
  )
}

async function continueWhenConfirmed(onContinue: () => void): Promise<void> {
  await window.aiTtrpg.campaignCreate.assertCanContinue()
  onContinue()
}
