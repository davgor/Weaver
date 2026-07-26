import type { NpcOpinion } from '@weaver/npc-engine'
import type {
  LoadNpcDossierRequest,
  NpcRelationshipSnapshot
} from '../../../shared/npcDossier/types'

type KnownNpcLink = LoadNpcDossierRequest & {
  displayName: string
}

type RelationshipWebProps = {
  holderName: string
  relationship: NpcRelationshipSnapshot | null
  knownPeople: readonly KnownNpcLink[]
  onOpenNpc: (request: LoadNpcDossierRequest) => void
}

export function RelationshipWeb(props: RelationshipWebProps): JSX.Element {
  const opinions = props.relationship?.opinions ?? []
  return (
    <section className="npc-dossier-section npc-relationship-web">
      <h2>Relationship Web</h2>
      <div className="npc-relationship-center">{props.holderName}</div>
      {opinions.length === 0 ? (
        <p className="npc-dossier-empty">No recorded opinions held by this NPC.</p>
      ) : (
        <ul className="npc-relationship-list">
          {opinions.map((opinion) => (
            <OpinionEdge
              key={`${opinion.holderNpcId}-${opinion.subjectId}`}
              opinion={opinion}
              knownPeople={props.knownPeople}
              onOpenNpc={props.onOpenNpc}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function OpinionEdge(props: {
  opinion: NpcOpinion
  knownPeople: readonly KnownNpcLink[]
  onOpenNpc: (request: LoadNpcDossierRequest) => void
}): JSX.Element {
  const knownSubject = props.knownPeople.find((person) => person.npcId === props.opinion.subjectId)
  return (
    <li>
      <div className="npc-relationship-line" aria-hidden="true" />
      <div className="npc-relationship-card">
        <SubjectLabel
          opinion={props.opinion}
          knownSubject={knownSubject}
          onOpenNpc={props.onOpenNpc}
        />
        <div className="npc-relationship-metrics">
          <Metric label="Trust" value={props.opinion.trust} />
          <Metric label="Fear" value={props.opinion.fear} />
          <Metric label="Affection" value={props.opinion.affection} />
        </div>
      </div>
    </li>
  )
}

function SubjectLabel(props: {
  opinion: NpcOpinion
  knownSubject: KnownNpcLink | undefined
  onOpenNpc: (request: LoadNpcDossierRequest) => void
}): JSX.Element {
  const label = props.knownSubject?.displayName ?? props.opinion.subjectId
  const subjectLink = buildSubjectLink(props)
  return (
    <div className="npc-relationship-subject">
      {subjectLink ?? <span>{label}</span>}
      <small>{props.opinion.stance ?? props.opinion.subjectKind}</small>
    </div>
  )
}

function buildSubjectLink(props: {
  opinion: NpcOpinion
  knownSubject: KnownNpcLink | undefined
  onOpenNpc: (request: LoadNpcDossierRequest) => void
}): JSX.Element | null {
  if (props.knownSubject === undefined || props.opinion.subjectKind !== 'npc') return null
  const subject = props.knownSubject
  return (
    <button
      type="button"
      className="npc-relationship-subject-link"
      onClick={() => props.onOpenNpc(subject)}
    >
      {subject.displayName}
    </button>
  )
}

function Metric(props: { label: string; value: number }): JSX.Element {
  return (
    <span className="npc-relationship-metric">
      {props.label}: {props.value}
    </span>
  )
}
