import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { itemEngine } from '@weaver/item-engine'
import type { FillAndValidateResult, TextCompleter } from '@weaver/narration-engine'
import { askTheDm } from './askDm.js'
import { assembleAskDmContext } from './assembleAskDmContext.js'
import {
  exportAskDmHistory,
  getAskDmHistory,
  importAskDmHistory,
  resetAskDmHistoryStore
} from './askDmHistory.js'
import type { AskDmNarrationApi } from './types.js'

beforeEach(() => {
  resetAskDmHistoryStore()
})

describe('assembleAskDmContext', () => {
  it('merges campaign and character facts with stable ids', () => {
    const facts = assembleAskDmContext({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      campaignFacts: { setting: 'moon roads', tone: 'grim' },
      characterFacts: { race: 'elf', archetype: 'ranger' }
    })

    expect(facts).toEqual({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      setting: 'moon roads',
      tone: 'grim',
      race: 'elf',
      archetype: 'ranger'
    })
  })
})

describe('askTheDm', () => {
  it('answers through NarrationEngine fillAndValidate and persists OOC history', async () => {
    const narration = scriptedNarration(
      'Race: elf. Archetype: ranger. Elves gain darkvision but not flight.'
    )

    const result = await askTheDm({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      question: 'Do elves have darkvision?',
      facts: facts(),
      narration,
      completer: scriptedCompleter()
    })

    expect(result).toEqual({
      ok: true,
      answer: 'Race: elf. Archetype: ranger. Elves gain darkvision but not flight.',
      history: {
        campaignId: 'camp-1',
        characterId: 'pc-1',
        entries: [
          { speaker: 'player', text: 'Do elves have darkvision?' },
          {
            speaker: 'dm',
            text: 'Race: elf. Archetype: ranger. Elves gain darkvision but not flight.'
          }
        ]
      },
      errors: []
    })
    expect(narration.calls[0]?.facts).toEqual({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      ...facts()
    })
    expect(narration.calls[0]?.stage).toContain('askDm.answer')
  })

  it('keeps OOC history separate per campaign and character', async () => {
    const narration = scriptedNarration('Race: elf. Archetype: ranger. Yes, quietly.')

    await askTheDm({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      question: 'Can I track in snow?',
      facts: facts(),
      narration,
      completer: scriptedCompleter()
    })
    await askTheDm({
      campaignId: 'camp-2',
      characterId: 'pc-1',
      question: 'What is the moon road?',
      facts: facts(),
      narration,
      completer: scriptedCompleter()
    })

    expect(getAskDmHistory('camp-1', 'pc-1')?.entries).toHaveLength(2)
    expect(getAskDmHistory('camp-2', 'pc-1')?.entries[0]?.text).toBe('What is the moon road?')
  })

  it('exports and imports OOC history for resume', async () => {
    const narration = scriptedNarration('Race: elf. Archetype: ranger. Rest is safe here.')

    await askTheDm({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      question: 'Can we rest?',
      facts: facts(),
      narration,
      completer: scriptedCompleter()
    })

    const saved = exportAskDmHistory()
    resetAskDmHistoryStore()
    importAskDmHistory(saved)

    expect(getAskDmHistory('camp-1', 'pc-1')?.entries).toHaveLength(2)
  })

  it('rejects empty questions', async () => {
    const result = await askTheDm({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      question: '   ',
      facts: facts(),
      narration: scriptedNarration('unused'),
      completer: scriptedCompleter()
    })

    expect(result).toEqual({ ok: false, errors: ['Ask-the-DM question must not be empty.'] })
    expect(getAskDmHistory('camp-1', 'pc-1')).toBeUndefined()
  })

  it('returns narration validation errors without adding a DM reply', async () => {
    const narration: AskDmNarrationApi = {
      fillAndValidate: async () => ({
        ok: false,
        filled: {},
        errors: ['Missing block for token ANSWER']
      })
    }

    const result = await askTheDm({
      campaignId: 'camp-1',
      characterId: 'pc-1',
      question: 'What spells can I prepare?',
      facts: facts(),
      narration,
      completer: scriptedCompleter()
    })

    expect(result).toEqual({ ok: false, errors: ['Missing block for token ANSWER'] })
    expect(getAskDmHistory('camp-1', 'pc-1')?.entries).toEqual([
      { speaker: 'player', text: 'What spells can I prepare?' }
    ])
  })
})

describe('askTheDm regression', () => {
  it('does not mutate currency, turn state, or import turn routing', async () => {
    const characterId = 'pc-ask-dm-regression'
    const startingBalance = 42
    itemEngine.credit(characterId, startingBalance)
    const debitSpy = vi.spyOn(itemEngine, 'debit')
    const creditSpy = vi.spyOn(itemEngine, 'credit')
    const turnState = { turn: 3, awaitingResolution: true }
    const mutationSpies = {
      resolveTurn: vi.fn(() => {
        throw new Error('Ask-the-DM must not resolve turns.')
      }),
      mutateHp: vi.fn(() => {
        throw new Error('Ask-the-DM must not mutate HP.')
      })
    }

    const result = await askTheDm({
      campaignId: 'camp-regression',
      characterId,
      question: 'How does opportunity attack work?',
      facts: facts(),
      narration: scriptedNarration(
        'Race: elf. Archetype: ranger. Opportunity attacks trigger when a foe leaves reach.'
      ),
      completer: scriptedCompleter()
    })

    expect(result.ok).toBe(true)
    expect(itemEngine.getBalance(characterId)).toBe(startingBalance)
    expect(debitSpy).not.toHaveBeenCalled()
    expect(creditSpy).not.toHaveBeenCalled()
    expect(turnState).toEqual({ turn: 3, awaitingResolution: true })
    expect(mutationSpies.resolveTurn).not.toHaveBeenCalled()
    expect(mutationSpies.mutateHp).not.toHaveBeenCalled()
    expect(askDmSource()).not.toMatch(/turnRouting/)

    debitSpy.mockRestore()
    creditSpy.mockRestore()
  })
})

function facts(): Record<string, string> {
  return { race: 'elf', archetype: 'ranger', campaign: 'moon roads' }
}

function scriptedCompleter(): TextCompleter {
  return {
    completeText: async () => ({ text: '', backend: 'scripted' })
  }
}

function scriptedNarration(answer: string): AskDmNarrationApi & {
  calls: Array<{ facts: Record<string, string>; stage: string }>
} {
  const calls: Array<{ facts: Record<string, string>; stage: string }> = []
  return {
    calls,
    fillAndValidate: async (input): Promise<FillAndValidateResult> => {
      calls.push({ facts: input.facts, stage: input.stage })
      return {
        ok: true,
        filled: { ANSWER: answer },
        filledText: answer,
        errors: []
      }
    }
  }
}

function askDmSource(): string {
  const path = fileURLToPath(new URL('./askDm.ts', import.meta.url))
  return readFileSync(path, 'utf8')
}
