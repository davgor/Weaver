import { vnCharacterStyleLockId } from '../vnImagePrompt/index.js'

export { vnCharacterStyleLockId }

export type VnConsistencyPolicy = {
  maxAttempts: number
}

export const DEFAULT_VN_CONSISTENCY_POLICY: VnConsistencyPolicy = { maxAttempts: 2 }

export type VnConsistencyOutcome = { imagePath: string } | { degraded: true }

export function vnSeedFromIdentity(identity: { characterKey: string }): string {
  return `vn-seed-${vnCharacterStyleLockId(identity.characterKey)}`
}

export async function generateWithConsistency(
  generateOnce: () => Promise<string | null>,
  policy: VnConsistencyPolicy,
  isAcceptable?: (imagePath: string) => boolean | Promise<boolean>
): Promise<VnConsistencyOutcome> {
  const attempts = Math.max(1, policy.maxAttempts)
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const imagePath = await generateOnce()
    if (imagePath !== null && (await accepts(imagePath, isAcceptable))) {
      return { imagePath }
    }
  }
  return { degraded: true }
}

async function accepts(
  imagePath: string,
  isAcceptable?: (imagePath: string) => boolean | Promise<boolean>
): Promise<boolean> {
  if (isAcceptable === undefined) {
    return true
  }
  return await isAcceptable(imagePath)
}
