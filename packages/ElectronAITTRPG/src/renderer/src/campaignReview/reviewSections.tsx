import type { ReactNode } from 'react'
import type { CampaignReviewSection, CampaignReviewSnapshot } from '../../../shared/campaignCreate/types'
import type { useCampaignReview } from './useCampaignReview'

type ReviewController = ReturnType<typeof useCampaignReview>

type ReviewBodyProps = {
  snapshot: CampaignReviewSnapshot
  ready: boolean
  review: ReviewController
}

export function ReviewBody({ snapshot, review, ready }: ReviewBodyProps): JSX.Element {
  const disabled = !ready || review.busy
  return (
    <div className="campaign-review-body">
      <WorldReview snapshot={snapshot} disabled={disabled} review={review} ready={ready} />
      <PantheonReview snapshot={snapshot} disabled={disabled} review={review} ready={ready} />
      <RegionsReview snapshot={snapshot} disabled={disabled} review={review} ready={ready} />
      <NpcsReview snapshot={snapshot} disabled={disabled} review={review} ready={ready} />
      <FactionsReview snapshot={snapshot} disabled={disabled} review={review} ready={ready} />
      <BestiaryReview snapshot={snapshot} disabled={disabled} review={review} ready={ready} />
      <ConfirmReviewPanel
        confirmed={snapshot.confirmed}
        busy={review.busy}
        ready={ready}
        onConfirm={() => void review.confirmReview()}
      />
    </div>
  )
}

type SectionProps = {
  snapshot: CampaignReviewSnapshot
  disabled: boolean
  ready: boolean
  review: ReviewController
}

function WorldReview({ snapshot, disabled, review, ready }: SectionProps): JSX.Element {
  return (
    <ReviewSection title="World" section="world" busy={review.busy} ready={ready} onRegenerate={review.regenerateSection}>
      <ReviewTextField label="Canon" value={snapshot.canon} disabled={disabled} onSave={(value) => void review.updateField('world', 'canon', value)} />
      <ReviewTextField label="World summary" value={snapshot.worldSummary} disabled={disabled} onSave={(value) => void review.updateField('world', 'worldSummary', value)} />
    </ReviewSection>
  )
}

function PantheonReview({ snapshot, disabled, review, ready }: SectionProps): JSX.Element {
  return (
    <ReviewSection title="Pantheon" section="pantheon" busy={review.busy} ready={ready} onRegenerate={review.regenerateSection}>
      <ReviewTextField label="Pantheon" value={snapshot.pantheon} disabled={disabled} onSave={(value) => void review.updateField('pantheon', 'pantheon', value)} />
    </ReviewSection>
  )
}

function RegionsReview({ snapshot, disabled, review, ready }: SectionProps): JSX.Element {
  return (
    <ReviewSection title="Regions" section="regions" busy={review.busy} ready={ready} onRegenerate={review.regenerateSection}>
      {snapshot.regions.map((region) => (
        <article key={region.regionId} className="campaign-review-card">
          <ReviewTextField label="Region name" value={region.displayName} disabled={disabled} onSave={(value) => void review.updateField('regions', 'displayName', value, region.regionId)} />
          <ReviewTextField label="Region summary" value={region.summary} disabled={disabled} onSave={(value) => void review.updateField('regions', 'summary', value, region.regionId)} />
          <button type="button" disabled={disabled} onClick={() => void review.generateRegionNpc({ regionId: region.regionId })}>
            Generate NPC
          </button>
        </article>
      ))}
    </ReviewSection>
  )
}

function NpcsReview({ snapshot, disabled, review, ready }: SectionProps): JSX.Element {
  return (
    <ReviewSection title="NPCs" section="npcs" busy={review.busy} ready={ready} onRegenerate={review.regenerateSection}>
      {snapshot.npcs.map((npc) => (
        <article key={npc.npcId} className="campaign-review-card">
          <ReviewTextField label="NPC name" value={npc.displayName} disabled={disabled} onSave={(value) => void review.updateField('npcs', 'displayName', value, npc.npcId)} />
          <ReviewTextField label="NPC summary" value={npc.summary} disabled={disabled} onSave={(value) => void review.updateField('npcs', 'summary', value, npc.npcId)} />
        </article>
      ))}
    </ReviewSection>
  )
}

function FactionsReview({ snapshot, disabled, review, ready }: SectionProps): JSX.Element {
  return (
    <ReviewSection title="Factions" section="factions" busy={review.busy} ready={ready} onRegenerate={review.regenerateSection}>
      {snapshot.factions.map((faction) => (
        <article key={faction.factionId} className="campaign-review-card">
          <ReviewTextField label="Faction name" value={faction.name} disabled={disabled} onSave={(value) => void review.updateField('factions', 'name', value, faction.factionId)} />
          <ReviewTextField label="Faction purpose" value={faction.purpose} disabled={disabled} onSave={(value) => void review.updateField('factions', 'purpose', value, faction.factionId)} />
        </article>
      ))}
    </ReviewSection>
  )
}

function BestiaryReview({ snapshot, disabled, review, ready }: SectionProps): JSX.Element {
  return (
    <ReviewSection title="Bestiary" section="bestiary" busy={review.busy} ready={ready} onRegenerate={review.regenerateSection}>
      <ReviewTextField label="Bestiary flavor" value={snapshot.bestiaryFlavor} disabled={disabled} onSave={(value) => void review.updateField('bestiary', 'bestiaryFlavor', value)} />
    </ReviewSection>
  )
}

type ReviewSectionProps = {
  title: string
  section: CampaignReviewSection
  busy: boolean
  ready: boolean
  onRegenerate: (section: CampaignReviewSection) => Promise<unknown>
  children: ReactNode
}

function ReviewSection({ title, section, busy, ready, onRegenerate, children }: ReviewSectionProps): JSX.Element {
  return (
    <section className="campaign-review-section">
      <header>
        <h2>{title}</h2>
        <button type="button" disabled={!ready || busy} onClick={() => void onRegenerate(section)}>
          Regenerate
        </button>
      </header>
      {children}
    </section>
  )
}

type ReviewTextFieldProps = {
  label: string
  value: string
  disabled: boolean
  onSave: (value: string) => void
}

function ReviewTextField({ label, value, disabled, onSave }: ReviewTextFieldProps): JSX.Element {
  return (
    <label className="campaign-field">
      <span>{label}</span>
      <textarea value={value} disabled={disabled} rows={3} onChange={(event) => onSave(event.target.value)} />
    </label>
  )
}

type ConfirmReviewPanelProps = {
  confirmed: boolean
  busy: boolean
  ready: boolean
  onConfirm: () => void
}

function ConfirmReviewPanel({ confirmed, busy, ready, onConfirm }: ConfirmReviewPanelProps): JSX.Element {
  return (
    <section className="campaign-review-confirm">
      <p>
        {confirmed
          ? 'Review confirmed. You can continue into character onboarding.'
          : 'Confirm the review when you are ready to continue.'}
      </p>
      <button type="button" disabled={!ready || busy || confirmed} onClick={onConfirm}>
        Confirm review
      </button>
    </section>
  )
}
