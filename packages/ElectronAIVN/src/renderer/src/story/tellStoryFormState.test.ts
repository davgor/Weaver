import { describe, expect, it } from 'vitest'
import {
  ACT_COUNT_HELP,
  createTellStoryFormState,
  draftFromForm,
  updateTellStoryField,
  validateTellStoryForm
} from './tellStoryFormState'

describe('tellStoryFormState', () => {
  it('defaults act count to 3 and documents the allowed range', () => {
    const state = createTellStoryFormState()
    expect(state.actCount).toBe(3)
    expect(ACT_COUNT_HELP).toMatch(/1–7/)
    expect(ACT_COUNT_HELP).toMatch(/default 3/)
  })

  it('validates required fields before submit', () => {
    const invalid = validateTellStoryForm(createTellStoryFormState())
    expect(invalid.error).toMatch(/premise/i)
    const filled = updateTellStoryField(
      updateTellStoryField(
        updateTellStoryField(
          updateTellStoryField(createTellStoryFormState(), 'premise', 'A tale'),
          'name',
          'Ryn'
        ),
        'personality',
        'stubborn'
      ),
      'appearance',
      'coat'
    )
    expect(validateTellStoryForm(filled).error).toBeNull()
    expect(draftFromForm(filled).mainCharacter.name).toBe('Ryn')
  })
})
