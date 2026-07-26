import type { EquipmentSlot } from '@weaver/item-engine'
import { demoSheetLoadRequest } from '../../../shared/characterSheet/demoCharacter'
import {
  CHARACTER_SHEET_TABS,
  sheetTabLabel,
  type CharacterSheetTab
} from '../../../shared/characterSheet/sheetTabs'
import type {
  CharacterSheetSnapshot,
  LoadCharacterSheetRequest
} from '../../../shared/characterSheet/types'
import { EquipmentPanel } from './EquipmentPanel'
import {
  JournalPanel,
  LogBookPanel,
  QuestLogPanel,
  SpellbookPanel
} from './RecordPanels'
import { StatsPanel } from './StatsPanel'
import { useCharacterSheet } from './useCharacterSheet'
import './characterSheet.css'

interface CharacterSheetOverlayProps {
  open: boolean
  request?: LoadCharacterSheetRequest
  onClose: () => void
  onOpenNpc?: (npcId: string) => void
}

export function CharacterSheetOverlay(props: CharacterSheetOverlayProps): JSX.Element | null {
  const request = props.request ?? demoSheetLoadRequest()
  const sheetState = useCharacterSheet(props.open, request)

  if (!props.open) return null

  return (
    <div className="character-sheet-overlay modal-overlay" role="dialog" aria-modal="true">
      <div className="character-sheet-panel-shell modal-panel">
        <SheetHeader
          title={sheetState.sheet?.characterName ?? request.characterName}
          onClose={props.onClose}
        />
        <SheetTabs tab={sheetState.tab} onSelect={sheetState.setTab} />
        <SheetBody sheetState={sheetState} onOpenNpc={props.onOpenNpc} />
      </div>
    </div>
  )
}

function SheetHeader(props: { title: string; onClose: () => void }): JSX.Element {
  return (
    <header className="character-sheet-header">
      <div>
        <p className="eyebrow">Character Sheet</p>
        <h1>{props.title}</h1>
      </div>
      <button
        type="button"
        className="character-sheet-overlay-close"
        onClick={props.onClose}
        aria-label="Close character sheet"
      >
        Close
      </button>
    </header>
  )
}

function SheetTabs(props: {
  tab: CharacterSheetTab
  onSelect: (tab: CharacterSheetTab) => void
}): JSX.Element {
  return (
    <nav className="character-sheet-tabs" aria-label="Character sheet panels">
      {CHARACTER_SHEET_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          className={
            tab === props.tab ? 'play-sheet-tab play-sheet-tab-active' : 'play-sheet-tab'
          }
          onClick={() => props.onSelect(tab)}
        >
          {sheetTabLabel(tab)}
        </button>
      ))}
    </nav>
  )
}

function SheetBody(props: {
  sheetState: ReturnType<typeof useCharacterSheet>
  onOpenNpc: ((npcId: string) => void) | undefined
}): JSX.Element {
  const { sheetState } = props
  return (
    <div className="character-sheet-body">
      {sheetState.error ? <p className="character-sheet-error">{sheetState.error}</p> : null}
      {sheetState.sheet ? (
        <SheetTabBody
          tab={sheetState.tab}
          sheet={sheetState.sheet}
          busy={sheetState.busy}
          onEquip={sheetState.equip}
          onUnequip={sheetState.unequip}
          onOpenNpc={props.onOpenNpc}
        />
      ) : (
        <p className="character-sheet-muted">Loading sheet…</p>
      )}
    </div>
  )
}

function SheetTabBody(props: {
  tab: CharacterSheetTab
  sheet: CharacterSheetSnapshot
  busy: boolean
  onEquip: (instanceId: string, slot: EquipmentSlot) => void
  onUnequip: (target: string) => void
  onOpenNpc: ((npcId: string) => void) | undefined
}): JSX.Element {
  switch (props.tab) {
    case 'stats':
      return <StatsPanel sheet={props.sheet} />
    case 'equipment':
      return (
        <EquipmentPanel
          sheet={props.sheet}
          busy={props.busy}
          onEquip={props.onEquip}
          onUnequip={props.onUnequip}
        />
      )
    case 'journal':
      return <JournalPanel entries={props.sheet.journal} onOpenNpc={props.onOpenNpc} />
    case 'logBook':
      return <LogBookPanel entries={props.sheet.logBook} />
    case 'quests':
      return (
        <QuestLogPanel
          mainQuests={props.sheet.mainQuests}
          sideQuests={props.sheet.sideQuests}
        />
      )
    case 'spellbook':
      return <SpellbookPanel knownActionIds={props.sheet.knownActionIds} />
  }
}
