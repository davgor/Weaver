import { type ChangeEvent, type FormEvent } from 'react'
import type { CampaignCreateDraft } from '../../../shared/campaignCreate/types'
import { deathModeOptions } from '../../../shared/campaignCreate/types'

type CampaignStartFormProps = {
  draft: CampaignCreateDraft
  busy: boolean
  error: string | null
  onClose: () => void
  onUpdate: (patch: Partial<CampaignCreateDraft>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function CampaignStartForm({
  draft,
  busy,
  error,
  onClose,
  onUpdate,
  onSubmit
}: CampaignStartFormProps): JSX.Element {
  return (
    <form className="campaign-start-form" onSubmit={onSubmit}>
      <PremiseField draft={draft} busy={busy} onUpdate={onUpdate} />
      <NameField draft={draft} busy={busy} onUpdate={onUpdate} />
      <DeathModeField draft={draft} busy={busy} onUpdate={onUpdate} />
      <GenerationCountFields draft={draft} busy={busy} onUpdate={onUpdate} />
      <GenerativeTokensField draft={draft} busy={busy} onUpdate={onUpdate} />
      {error !== null ? <p className="campaign-error">{error}</p> : null}
      <footer className="campaign-start-actions">
        <button type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button type="submit" disabled={busy}>
          {busy ? 'Generating…' : 'Generate campaign'}
        </button>
      </footer>
    </form>
  )
}

function PremiseField(props: FieldProps): JSX.Element {
  return (
    <label className="campaign-field">
      <span>Premise</span>
      <textarea
        value={props.draft.premise}
        onChange={textChange(props.onUpdate, 'premise')}
        rows={4}
        required
        disabled={props.busy}
      />
    </label>
  )
}

function NameField(props: FieldProps): JSX.Element {
  return (
    <label className="campaign-field">
      <span>Campaign name (optional)</span>
      <input
        type="text"
        value={props.draft.name ?? ''}
        onChange={textChange(props.onUpdate, 'name')}
        disabled={props.busy}
      />
    </label>
  )
}

function DeathModeField(props: FieldProps): JSX.Element {
  return (
    <fieldset className="campaign-field" disabled={props.busy}>
      <legend>Death mode</legend>
      {deathModeOptions.map((option) => (
        <label key={option.id} className="campaign-choice">
          <input
            type="radio"
            name="deathMode"
            value={option.id}
            checked={props.draft.deathMode === option.id}
            onChange={() => props.onUpdate({ deathMode: option.id })}
          />
          <span>
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </span>
        </label>
      ))}
    </fieldset>
  )
}

function GenerationCountFields(props: FieldProps): JSX.Element {
  return (
    <>
      <label className="campaign-field">
        <span>Region count (0–5)</span>
        <input
          type="number"
          min={0}
          max={5}
          value={props.draft.regionCount}
          onChange={countChange(props.onUpdate, 'regionCount')}
          disabled={props.busy}
        />
      </label>
      <label className="campaign-field">
        <span>NPCs per region (0–10)</span>
        <input
          type="number"
          min={0}
          max={10}
          value={props.draft.npcsPerRegion}
          onChange={countChange(props.onUpdate, 'npcsPerRegion')}
          disabled={props.busy}
        />
      </label>
    </>
  )
}

function GenerativeTokensField(props: FieldProps): JSX.Element {
  return (
    <label className="campaign-toggle">
      <input
        type="checkbox"
        checked={props.draft.generativeTokensEnabled}
        onChange={(event) => props.onUpdate({ generativeTokensEnabled: event.target.checked })}
        disabled={props.busy}
      />
      <span>Enable generative tokens for this campaign</span>
    </label>
  )
}

type FieldProps = {
  draft: CampaignCreateDraft
  busy: boolean
  onUpdate: (patch: Partial<CampaignCreateDraft>) => void
}

function textChange(
  onUpdate: FieldProps['onUpdate'],
  field: 'premise' | 'name'
) {
  return (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    onUpdate({ [field]: event.target.value })
  }
}

function countChange(
  onUpdate: FieldProps['onUpdate'],
  field: 'regionCount' | 'npcsPerRegion'
) {
  return (event: ChangeEvent<HTMLInputElement>) => {
    onUpdate({ [field]: Number(event.target.value) })
  }
}
