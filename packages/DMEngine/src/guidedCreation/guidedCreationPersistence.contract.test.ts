import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createCampaignSession,
  getActiveCampaignSession,
  openCampaignSession
} from '../persistence/campaignSession.js'
import {
  getGuidedCreationState,
  resetGuidedCreationStateStore,
  saveGuidedCreationState,
  startGuidedIdentityState
} from './phaseState.js'

describe('guided creation campaign-session persistence', () => {
  afterEach(() => {
    getActiveCampaignSession()?.close()
    resetGuidedCreationStateStore()
  })

  it('write-through persists guided state across campaign session reopen', () => {
    withCampaignPath((filePath) => {
      const created = createCampaignSession({ campaignId: 'guided-campaign', filePath })
      startGuidedIdentityState({ campaignId: 'guided-campaign', characterId: 'pc-guided' })
      saveGuidedCreationState({
        campaignId: 'guided-campaign',
        characterId: 'pc-guided',
        guidedCreationPhase: 'opening_scene',
        transcript: [
          { speaker: 'player', phase: 'who', text: 'I am the keeper.' },
          { speaker: 'dm', phase: 'why', text: 'The old bell answers.' }
        ],
        characterFacts: { oath: 'keeper' },
        enterWorldUnlocked: false,
        openingScene: 'Rain gathers at the inn door.'
      })
      created.close()

      openCampaignSession({ campaignId: 'guided-campaign', filePath })
      expect(getGuidedCreationState('pc-guided')).toMatchObject({
        guidedCreationPhase: 'opening_scene',
        openingScene: 'Rain gathers at the inn door.',
        transcript: [
          { speaker: 'player', phase: 'who', text: 'I am the keeper.' },
          { speaker: 'dm', phase: 'why', text: 'The old bell answers.' }
        ]
      })
    })
  })
})

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-guided-session-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
