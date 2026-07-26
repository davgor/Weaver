import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearCompanionStore,
  clearStartingLoadoutStore,
  createCompanion,
  listCompanions,
  selectStartingLoadout
} from '@weaver/character-engine'

describe('ElectronAITTRPG contract: CharacterEngine companions API', () => {
  beforeEach(() => {
    clearCompanionStore()
    clearStartingLoadoutStore()
  })

  it('lists companions created for a player character after onboarding equipment is ready', () => {
    selectStartingLoadout('pc-companion-owner', 'Ranger')
    const companion = createCompanion({
      campaignId: 'camp-companions',
      ownerCharacterId: 'pc-companion-owner',
      name: 'Briar',
      archetype: 'Ranger'
    })

    expect(listCompanions('pc-companion-owner')).toEqual([companion])
  })
})
