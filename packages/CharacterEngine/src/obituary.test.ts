import { beforeEach, describe, expect, it } from 'vitest'
import { resolveObituaryText, setObituaryDrafter } from './obituary.js'

describe('obituary drafting', () => {
  beforeEach(() => {
    setObituaryDrafter(undefined)
  })

  it('uses a supplied draft without calling the injected drafter', async () => {
    setObituaryDrafter(() => 'should-not-run')

    await expect(
      resolveObituaryText(
        { characterId: 'pc-1', campaignId: 'camp-1', cause: 'dragon fire' },
        'Brave to the end.'
      )
    ).resolves.toBe('Brave to the end.')
  })

  it('calls the injected drafter when no draft is supplied', async () => {
    setObituaryDrafter(({ characterId, cause }) => `${characterId} fell to ${cause}.`)

    await expect(
      resolveObituaryText({ characterId: 'pc-1', campaignId: 'camp-1', cause: 'a pit trap' })
    ).resolves.toBe('pc-1 fell to a pit trap.')
  })

  it('requires a draft or injected drafter for legendary deaths', async () => {
    await expect(
      resolveObituaryText({ characterId: 'pc-1', campaignId: 'camp-1', cause: 'unknown' })
    ).rejects.toMatchObject({ code: 'OBITUARY_REQUIRED' })
  })
})
