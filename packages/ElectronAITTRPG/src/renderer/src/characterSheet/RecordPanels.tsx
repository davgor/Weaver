import type {
  SheetJournalEntry,
  SheetLogBookEntry,
  SheetQuestEntry
} from '../../../shared/characterSheet/types'

interface JournalPanelProps {
  entries: SheetJournalEntry[]
  onOpenNpc: ((npcId: string) => void) | undefined
}

export function JournalPanel(props: JournalPanelProps): JSX.Element {
  return (
    <div className="character-sheet-panel">
      <h2>Journal</h2>
      <RecordList
        empty="No journal entries yet"
        items={props.entries.map((entry) => ({
          id: entry.id,
          title: entry.createdAt,
          body: entry.text,
          ...(entry.linkedNpcId === undefined ? {} : { linkedNpcId: entry.linkedNpcId })
        }))}
        onOpenNpc={props.onOpenNpc}
      />
    </div>
  )
}

interface LogBookPanelProps {
  entries: SheetLogBookEntry[]
}

export function LogBookPanel(props: LogBookPanelProps): JSX.Element {
  return (
    <div className="character-sheet-panel">
      <h2>Log Book</h2>
      <RecordList
        empty="No log-book events yet"
        items={props.entries.map((entry) => ({
          id: entry.id,
          title: `${entry.type} · ${entry.createdAt}`,
          body: JSON.stringify(entry.payload)
        }))}
      />
    </div>
  )
}

interface QuestLogPanelProps {
  mainQuests: SheetQuestEntry[]
  sideQuests: SheetQuestEntry[]
}

export function QuestLogPanel(props: QuestLogPanelProps): JSX.Element {
  return (
    <div className="character-sheet-panel">
      <h2>Main Quests</h2>
      <QuestList quests={props.mainQuests} empty="No main quests" />
      <h2>Side Quests</h2>
      <QuestList quests={props.sideQuests} empty="No side quests" />
    </div>
  )
}

interface SpellbookPanelProps {
  knownActionIds: string[]
}

export function SpellbookPanel(props: SpellbookPanelProps): JSX.Element {
  return (
    <div className="character-sheet-panel">
      <h2>Spellbook</h2>
      <p className="character-sheet-muted">
        Known ActionEngine action ids (spells and class actions).
      </p>
      <ul className="character-sheet-action-list">
        {props.knownActionIds.length === 0 ? (
          <li className="character-sheet-empty">No known actions</li>
        ) : (
          props.knownActionIds.map((actionId) => <li key={actionId}>{actionId}</li>)
        )}
      </ul>
    </div>
  )
}

function QuestList(props: { quests: SheetQuestEntry[]; empty: string }): JSX.Element {
  if (props.quests.length === 0) {
    return <p className="character-sheet-empty">{props.empty}</p>
  }
  return (
    <ul className="character-sheet-quest-list">
      {props.quests.map((quest) => (
        <li key={quest.questId}>
          <span className="character-sheet-quest-title">
            {quest.title ?? quest.questId}
          </span>
          <span className="character-sheet-quest-status">{quest.status}</span>
        </li>
      ))}
    </ul>
  )
}

function RecordList(props: {
  empty: string
  items: Array<{ id: string; title: string; body: string; linkedNpcId?: string }>
  onOpenNpc?: ((npcId: string) => void) | undefined
}): JSX.Element {
  if (props.items.length === 0) {
    return <p className="character-sheet-empty">{props.empty}</p>
  }
  return (
    <ul className="character-sheet-record-list">
      {props.items.map((item) => (
        <li key={item.id}>
          <div className="character-sheet-record-title">{item.title}</div>
          <div className="character-sheet-record-body">{item.body}</div>
          <NpcJournalLink linkedNpcId={item.linkedNpcId} onOpenNpc={props.onOpenNpc} />
        </li>
      ))}
    </ul>
  )
}

function NpcJournalLink(props: {
  linkedNpcId: string | undefined
  onOpenNpc: ((npcId: string) => void) | undefined
}): JSX.Element | null {
  const linkedNpcId = props.linkedNpcId
  const onOpenNpc = props.onOpenNpc
  if (linkedNpcId === undefined || onOpenNpc === undefined) return null
  return (
    <button
      type="button"
      className="character-sheet-npc-link"
      onClick={() => onOpenNpc(linkedNpcId)}
    >
      Open NPC dossier
    </button>
  )
}
