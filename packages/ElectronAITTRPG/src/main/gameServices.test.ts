import { describe, expect, it, vi } from 'vitest'
import type { LlmRuntime } from '@weaver/llm-engine'
import { createSettingsRuntime } from './settings/applySettings.js'
import { createSettingsStore } from './settings/settingsStore.js'
import { createSharedSettingsServices } from './settings/sharedSettingsServices.js'
import { buildDefaultSettingsSnapshot } from '../shared/settings/types.js'
import { createLiveGenerationDeps } from './campaignCreate/runGeneration.js'
import { createLiveResolveTurnDeps } from './play/livePlayDeps.js'
import { createLiveOnboardingPorts } from './onboarding/onboardingService.js'

describe('game services Settings completer wiring', () => {
  it('shares one Settings-backed completer across create, play, and onboarding factories', async () => {
    const completeText = vi.fn(async () => ({ text: 'shared-live', backend: 'openai' as const }))
    const client: LlmRuntime = { completeText, dispose: async () => undefined }
    const runtime = createSettingsRuntime({
      createTextClient: () => client
    })
    const store = createSettingsStore({ initialSnapshot: buildDefaultSettingsSnapshot() })
    const settings = createSharedSettingsServices({
      store,
      runtime,
      createFallbackClient: () => {
        throw new Error('should use applied client')
      }
    })
    await runtime.applySettings(store.get())
    const completer = settings.textCompleter

    const genDeps = createLiveGenerationDeps(completer)
    const turnDeps = createLiveResolveTurnDeps(completer)
    const onboardingPorts = createLiveOnboardingPorts({ completer })

    await expect(genDeps.completer.completeText({ prompt: 'c' })).resolves.toMatchObject({
      text: 'shared-live'
    })
    await expect(turnDeps.narration.llm.completeText({ prompt: 'p' })).resolves.toMatchObject({
      text: 'shared-live'
    })
    await expect(
      onboardingPorts.narration.completer.completeText({ prompt: 'o' })
    ).resolves.toMatchObject({ text: 'shared-live' })
    expect(completeText.mock.calls.length).toBeGreaterThanOrEqual(3)
  })
})
