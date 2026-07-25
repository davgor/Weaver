import { describe, expect, it } from 'vitest'
import { DEFAULT_MODEL, QWEN_2_5_7B_INSTRUCT_Q4_K_M } from './modelCatalog.js'

describe('modelCatalog', () => {
  it('pins Qwen2.5 7B Instruct Q4_K_M as the default local model', () => {
    expect(DEFAULT_MODEL).toEqual(QWEN_2_5_7B_INSTRUCT_Q4_K_M)
    expect(DEFAULT_MODEL.quantization).toBe('Q4_K_M')
    expect(DEFAULT_MODEL.filename).toBe('qwen2.5-7b-instruct-q4_k_m.gguf')
    expect(DEFAULT_MODEL.downloadUrl).toContain('Qwen2.5-7B-Instruct-GGUF')
    expect(DEFAULT_MODEL.downloadUrl).toContain('q4_k_m')
  })
})
