import { describe, expect, it } from 'vitest'
import { defaultLlmDataDir } from './defaultEngine.js'

describe('defaultLlmDataDir', () => {
  it('uses WEAVER_LLM_DATA_DIR when set', () => {
    const previous = process.env.WEAVER_LLM_DATA_DIR
    process.env.WEAVER_LLM_DATA_DIR = 'D:/models/weaver'
    expect(defaultLlmDataDir('/repo')).toBe('D:/models/weaver')
    if (previous === undefined) {
      delete process.env.WEAVER_LLM_DATA_DIR
    } else {
      process.env.WEAVER_LLM_DATA_DIR = previous
    }
  })

  it('defaults to .weaver-llm under cwd', () => {
    const previous = process.env.WEAVER_LLM_DATA_DIR
    delete process.env.WEAVER_LLM_DATA_DIR
    expect(defaultLlmDataDir('/repo')).toMatch(/\.weaver-llm$/)
    if (previous !== undefined) {
      process.env.WEAVER_LLM_DATA_DIR = previous
    }
  })
})
