import { describe, expect, it } from 'vitest'
import {
  getCharacterIdentity,
  listCampaignBackgrounds,
  listCampaignRaces,
  selectBackground,
  selectRace,
  setCampaignBackgroundRoster,
  setCampaignRaceRoster
} from './index.js'

describe('race and background selection', () => {
  it('realizes campaign race lore once and reuses it for later characters', () => {
    setCampaignRaceRoster('campaign-races', [
      { raceId: 'riverfolk', name: 'Riverfolk' },
      { raceId: 'ordinary-human', name: 'Ordinary Human' }
    ])

    const first = selectRace({
      campaignId: 'campaign-races',
      characterId: 'pc-race-a',
      raceId: 'ordinary-human',
      lore: 'A grounded people known for patient craft.'
    })
    const second = selectRace({
      campaignId: 'campaign-races',
      characterId: 'pc-race-b',
      raceId: 'ordinary-human',
      lore: 'This later lore should not replace the campaign realization.'
    })

    expect(first.lore).toBe('A grounded people known for patient craft.')
    expect(second.lore).toBe(first.lore)
    expect(listCampaignRaces('campaign-races')[1]).toMatchObject({
      raceId: 'ordinary-human',
      name: 'Ordinary Human'
    })
  })

  it('persists background selection with a personal-story hook field', () => {
    setCampaignBackgroundRoster('campaign-backgrounds', [
      {
        backgroundId: 'village-smith',
        name: 'Village Smith',
        description: 'A practical trade background.',
        personalStoryHook: 'What did your first master teach you?'
      }
    ])

    const selection = selectBackground({
      campaignId: 'campaign-backgrounds',
      characterId: 'pc-background',
      backgroundId: 'village-smith',
      personalStory: 'I left the forge to repay an old debt.'
    })

    expect(selection.personalStoryHook).toBe('What did your first master teach you?')
    expect(selection.personalStory).toBe('I left the forge to repay an old debt.')
    expect(listCampaignBackgrounds('campaign-backgrounds')).toHaveLength(1)
    expect(getCharacterIdentity('pc-background')?.background?.backgroundId).toBe('village-smith')
  })
})
