import type { NpcDossier } from '@weaver/npc-engine'
import type { LoadNpcDossierRequest } from '../../../shared/npcDossier/types'
import { RelationshipWeb } from './RelationshipWeb'
import { useNpcDossier } from './useNpcDossier'
import './npcDossier.css'

type KnownNpcLink = LoadNpcDossierRequest & {
  displayName: string
}

type NpcDossierOverlayProps = {
  open: boolean
  request: LoadNpcDossierRequest | null
  knownPeople: readonly KnownNpcLink[]
  onClose: () => void
  onOpenNpc: (request: LoadNpcDossierRequest) => void
}

export function NpcDossierOverlay(props: NpcDossierOverlayProps): JSX.Element | null {
  const dossierState = useNpcDossier(props.open, props.request)
  if (!props.open || props.request === null) return null
  const title = dossierState.dossier?.displayName ?? props.request.npcId
  return (
    <div className="npc-dossier-overlay modal-overlay" role="dialog" aria-modal="true">
      <div className="npc-dossier-panel modal-panel">
        <DossierHeader title={title} onClose={props.onClose} />
        <DossierBody
          dossier={dossierState.dossier}
          error={dossierState.error}
          knownPeople={props.knownPeople}
          onOpenNpc={props.onOpenNpc}
          relationship={dossierState.relationship}
        />
      </div>
    </div>
  )
}

function DossierHeader(props: { title: string; onClose: () => void }): JSX.Element {
  return (
    <header className="npc-dossier-header">
      <div>
        <p className="eyebrow">NPC Dossier</p>
        <h1>{props.title}</h1>
      </div>
      <button
        type="button"
        className="npc-dossier-overlay-close"
        onClick={props.onClose}
        aria-label="Close NPC dossier"
      >
        Close
      </button>
    </header>
  )
}

function DossierBody(props: {
  dossier: NpcDossier | null
  error: string | null
  knownPeople: readonly KnownNpcLink[]
  onOpenNpc: (request: LoadNpcDossierRequest) => void
  relationship: ReturnType<typeof useNpcDossier>['relationship']
}): JSX.Element {
  if (props.error !== null) return <p className="npc-dossier-error">{props.error}</p>
  if (props.dossier === null) return <p className="npc-dossier-muted">Loading dossier...</p>
  return (
    <div className="npc-dossier-body">
      <TraitSection dossier={props.dossier} />
      <FactSection dossier={props.dossier} />
      <DmOpinionSection dossier={props.dossier} />
      <DispositionSection dossier={props.dossier} />
      <RelationshipWeb
        holderName={props.dossier.displayName ?? props.dossier.npcId}
        relationship={props.relationship}
        knownPeople={props.knownPeople}
        onOpenNpc={props.onOpenNpc}
      />
    </div>
  )
}

function TraitSection(props: { dossier: NpcDossier }): JSX.Element {
  const traits = props.dossier.traits
  return (
    <section className="npc-dossier-section">
      <h2>Traits</h2>
      <dl className="npc-dossier-traits">
        <Trait label="Race" value={traits.race.name} />
        <Trait label="Background" value={traits.background?.name ?? 'Unknown'} />
        <Trait label="Alignment" value={traits.alignment} />
        <Trait label="Temperament" value={traits.temperament} />
        <Trait label="Species" value={traits.speciesKind} />
        <Trait label="Speech" value={traits.nonSpeaking ? 'Non-speaking' : 'Speaking'} />
      </dl>
    </section>
  )
}

function Trait(props: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt>{props.label}</dt>
      <dd>{props.value}</dd>
    </div>
  )
}

function FactSection(props: { dossier: NpcDossier }): JSX.Element {
  return (
    <section className="npc-dossier-section">
      <h2>Facts</h2>
      {props.dossier.facts.length === 0 ? (
        <p className="npc-dossier-empty">No facts recorded for this NPC.</p>
      ) : (
        <ul className="npc-dossier-facts">
          {props.dossier.facts.map((fact) => (
            <li key={fact.factId}>{fact.text}</li>
          ))}
        </ul>
      )}
    </section>
  )
}

function DmOpinionSection(props: { dossier: NpcDossier }): JSX.Element {
  return (
    <section className="npc-dossier-section">
      <h2>DM Opinion</h2>
      <p>{props.dossier.dmOpinion ?? 'No DM opinion recorded.'}</p>
    </section>
  )
}

function DispositionSection(props: { dossier: NpcDossier }): JSX.Element {
  const disposition = props.dossier.disposition
  return (
    <section className="npc-dossier-section">
      <h2>Disposition</h2>
      <p>
        {disposition === null
          ? 'No combat disposition recorded.'
          : `${disposition.disposition} by ${disposition.source.actorId}`}
      </p>
    </section>
  )
}
