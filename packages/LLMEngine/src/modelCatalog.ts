export type ModelSpec = {
  id: 'qwen2.5-7b-instruct-q4_k_m'
  displayName: string
  family: 'Qwen2.5'
  variant: '7B Instruct'
  quantization: 'Q4_K_M'
  filename: string
  hubRepo: string
  downloadUrl: string
  approxBytes: number
}

/** Fixed local model for Weaver — UI packages prompt install of this artifact. */
export const QWEN_2_5_7B_INSTRUCT_Q4_K_M: ModelSpec = {
  id: 'qwen2.5-7b-instruct-q4_k_m',
  displayName: 'Qwen2.5 7B Instruct (Q4_K_M)',
  family: 'Qwen2.5',
  variant: '7B Instruct',
  quantization: 'Q4_K_M',
  filename: 'qwen2.5-7b-instruct-q4_k_m.gguf',
  hubRepo: 'Qwen/Qwen2.5-7B-Instruct-GGUF',
  downloadUrl:
    'https://huggingface.co/Qwen/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct-q4_k_m.gguf',
  approxBytes: 4_680_000_000
}

export const DEFAULT_MODEL = QWEN_2_5_7B_INSTRUCT_Q4_K_M
