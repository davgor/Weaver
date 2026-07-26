import {
  compatibleEquipSlots,
  equipmentSlotLabel,
  listFixedSlotEntries
} from '../../../shared/characterSheet/equipmentSlots'
import type { CharacterSheetSnapshot } from '../../../shared/characterSheet/types'
import type { EquipmentSlot, ItemView } from '@weaver/item-engine'

interface EquipmentPanelProps {
  sheet: CharacterSheetSnapshot
  busy: boolean
  onEquip: (instanceId: string, slot: EquipmentSlot) => void
  onUnequip: (target: string) => void
}

export function EquipmentPanel(props: EquipmentPanelProps): JSX.Element {
  const { sheet, busy, onEquip, onUnequip } = props
  return (
    <div className="character-sheet-panel">
      <h2>Equipped</h2>
      <EquippedSlotsList sheet={sheet} busy={busy} onUnequip={onUnequip} />
      <h2>Held</h2>
      <HeldItemsList held={sheet.held} busy={busy} onEquip={onEquip} />
    </div>
  )
}

function EquippedSlotsList(props: {
  sheet: CharacterSheetSnapshot
  busy: boolean
  onUnequip: (target: string) => void
}): JSX.Element {
  return (
    <ul className="character-sheet-equip-slots">
      {listFixedSlotEntries(props.sheet.equipped).map((entry) => (
        <FixedSlotRow
          key={entry.slot}
          entry={entry}
          busy={props.busy}
          onUnequip={props.onUnequip}
        />
      ))}
      <AccessorySlotsRow
        accessories={props.sheet.equipped.accessories}
        busy={props.busy}
        onUnequip={props.onUnequip}
      />
    </ul>
  )
}

function FixedSlotRow(props: {
  entry: ReturnType<typeof listFixedSlotEntries>[number]
  busy: boolean
  onUnequip: (target: string) => void
}): JSX.Element {
  const { entry, busy, onUnequip } = props
  return (
    <li>
      <span className="character-sheet-slot-label">{entry.label}</span>
      <span className="character-sheet-slot-item">
        {entry.item ? itemLabel(entry.item) : 'Empty'}
      </span>
      {entry.item ? (
        <button type="button" disabled={busy} onClick={() => onUnequip(entry.slot)}>
          Unequip
        </button>
      ) : null}
    </li>
  )
}

function AccessorySlotsRow(props: {
  accessories: ItemView[]
  busy: boolean
  onUnequip: (target: string) => void
}): JSX.Element {
  return (
    <li>
      <span className="character-sheet-slot-label">{equipmentSlotLabel('accessories')}</span>
      <ul className="character-sheet-accessory-list">
        {props.accessories.length === 0 ? (
          <li>Empty</li>
        ) : (
          props.accessories.map((item) => (
            <li key={item.instance.id}>
              <span>{itemLabel(item)}</span>
              <button
                type="button"
                disabled={props.busy}
                onClick={() => props.onUnequip(item.instance.id)}
              >
                Unequip
              </button>
            </li>
          ))
        )}
      </ul>
    </li>
  )
}

function HeldItemsList(props: {
  held: ItemView[]
  busy: boolean
  onEquip: (instanceId: string, slot: EquipmentSlot) => void
}): JSX.Element {
  return (
    <ul className="character-sheet-held-list">
      {props.held.length === 0 ? (
        <li className="character-sheet-empty">No held items</li>
      ) : (
        props.held.map((item) => (
          <HeldItemRow
            key={item.instance.id}
            item={item}
            busy={props.busy}
            onEquip={props.onEquip}
          />
        ))
      )}
    </ul>
  )
}

function HeldItemRow(props: {
  item: ItemView
  busy: boolean
  onEquip: (instanceId: string, slot: EquipmentSlot) => void
}): JSX.Element {
  const slots = compatibleEquipSlots(props.item)
  return (
    <li>
      <span>{itemLabel(props.item)}</span>
      {slots.length === 0 ? (
        <span className="character-sheet-muted">Not equippable</span>
      ) : (
        <span className="character-sheet-equip-actions">
          {slots.map((slot) => (
            <button
              key={slot}
              type="button"
              disabled={props.busy}
              onClick={() => props.onEquip(props.item.instance.id, slot)}
            >
              Equip {equipmentSlotLabel(slot)}
            </button>
          ))}
        </span>
      )}
    </li>
  )
}

function itemLabel(item: ItemView): string {
  return item.instance.customName ?? item.template.name
}
