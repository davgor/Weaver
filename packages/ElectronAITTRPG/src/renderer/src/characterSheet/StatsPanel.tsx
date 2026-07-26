import { formatModifier } from '../../../shared/characterSheet/abilityRows'
import type { CharacterSheetSnapshot } from '../../../shared/characterSheet/types'

interface StatsPanelProps {
  sheet: CharacterSheetSnapshot
}

export function StatsPanel(props: StatsPanelProps): JSX.Element {
  const { sheet } = props
  return (
    <div className="character-sheet-panel">
      <h2>Ability Scores</h2>
      <ul className="character-sheet-ability-list">
        {sheet.abilityRows.map((row) => (
          <li key={row.ability}>
            <span className="character-sheet-ability-name">{row.ability}</span>
            <span className="character-sheet-ability-score">{row.score}</span>
            <span className="character-sheet-ability-mod">{formatModifier(row.modifier)}</span>
          </li>
        ))}
      </ul>
      <h2>Combat</h2>
      <dl className="character-sheet-combat-stats">
        <div>
          <dt>HP</dt>
          <dd>
            {sheet.currentHp} / {sheet.maxHp}
          </dd>
        </div>
        <div>
          <dt>AC</dt>
          <dd>{sheet.armorClass}</dd>
        </div>
      </dl>
    </div>
  )
}
