import { beforeEach, describe, expect, it } from 'vitest'
import { createSeedCatalog, getAction } from '@weaver/action-engine'
import { applyLevelUpChoice, beginLevelUpCeremony } from '../levelUp.js'
import { listKnownActions } from '../records.js'
import { clearStartingLoadoutStore, selectStartingLoadout } from '../startingLoadout.js'
import { setCharacterProgression } from '../xp.js'

describe('CharacterEngine -> ActionEngine level-up action contract', () => {
  beforeEach(() => {
    clearStartingLoadoutStore()
  })

  it('records only real ActionEngine catalog action ids from level-up templates', async () => {
    const catalog = createSeedCatalog()
    const characterId = 'contract-level-up-actions'
    selectStartingLoadout(characterId, 'Mage', 3)
    setCharacterProgression(characterId, 3, 0)

    const ceremony = await beginLevelUpCeremony({
      characterId,
      archetype: 'Mage',
      currentLevel: 3
    })
    const actionChoice = ceremony.choices.find((choice) => choice.grantedActionIds.length > 0)
    expect(actionChoice).toBeDefined()

    applyLevelUpChoice({
      characterId,
      archetype: 'Mage',
      currentLevel: 3,
      templateId: actionChoice!.templateId
    })

    for (const actionId of listKnownActions(characterId)) {
      expect(getAction(catalog.actions, actionId)?.actionId).toBe(actionId)
    }
  })
})
