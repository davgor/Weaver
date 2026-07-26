import { useCallback, useEffect, useState } from 'react'
import type {
  BackgroundRosterEntry,
  RaceRosterEntry,
  RolledAbilityScoreDraft
} from '@weaver/character-engine'
import type { ArchetypeDefinition } from '@weaver/character-engine'
import type {
  BackgroundStepRequest,
  BeginOnboardingRequest,
  CompanionsStepPayload,
  MechanicalSetupRequest,
  OnboardingContextRequest,
  OnboardingSnapshot,
  RaceStepRequest,
  GuidedIdentityRequest
} from '../../../shared/onboarding/types'
import type { GameApi } from '../../../shared/gameApi'
import type { OnboardingApi } from '../../../shared/onboarding/types'
import { canEnterPlay } from './wizardPhase'

type GameApiWithOnboarding = GameApi & { onboarding: OnboardingApi }

type WizardResources = {
  archetypes: ArchetypeDefinition[]
  races: RaceRosterEntry[]
  backgrounds: BackgroundRosterEntry[]
}

type WizardMutationState = {
  request: BeginOnboardingRequest | null
  setSnapshot: (snapshot: OnboardingSnapshot) => void
  setBusy: (busy: boolean) => void
  setError: (error: string | null) => void
  setChatErrors: (errors: string[]) => void
}

export function useOnboardingWizard(request: BeginOnboardingRequest | null) {
  const [snapshot, setSnapshot] = useState<OnboardingSnapshot | null>(null)
  const [resources, setResources] = useState<WizardResources | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [chatErrors, setChatErrors] = useState<string[]>([])

  useEffect(() => {
    if (request === null) return
    return beginWizard(request, setSnapshot, setResources, setError)
  }, [request?.campaignId, request?.characterId, request?.characterName])

  const run = useRunOnboardingStep(setSnapshot, setBusy, setError)
  const mutationState: WizardMutationState = { request, setSnapshot, setBusy, setError, setChatErrors }
  const saveActions = useOnboardingSaveActions(mutationState, run)
  const flowActions = useOnboardingFlowActions(mutationState, run)
  const chatActions = useOnboardingChatActions(mutationState)

  return {
    snapshot,
    resources,
    busy,
    error,
    chatErrors,
    readyForPlay: snapshot !== null && canEnterPlay(snapshot.phase),
    ...saveActions,
    ...flowActions,
    ...chatActions
  }
}

function useRunOnboardingStep(
  setSnapshot: (snapshot: OnboardingSnapshot) => void,
  setBusy: (busy: boolean) => void,
  setError: (error: string | null) => void
) {
  return useCallback(async (action: () => Promise<OnboardingSnapshot>) => {
    setBusy(true)
    setError(null)
    try {
      const next = await action()
      setSnapshot(next)
      return next
    } catch (err: unknown) {
      setError(errorMessage(err))
      throw err
    } finally {
      setBusy(false)
    }
  }, [setSnapshot, setBusy, setError])
}

function useOnboardingSaveActions(
  state: WizardMutationState,
  run: (action: () => Promise<OnboardingSnapshot>) => Promise<OnboardingSnapshot>
) {
  const withContext = useOnboardingContext(state.request)
  const saveMechanicalSetup = useCallback(
    async (payload: Omit<MechanicalSetupRequest, keyof OnboardingContextRequest>) => {
      await run(() => readOnboardingApi().saveMechanicalSetup(withContext(payload)))
    },
    [run, withContext]
  )
  const saveRace = useCallback(
    async (payload: Omit<RaceStepRequest, keyof OnboardingContextRequest>) => {
      await run(() => readOnboardingApi().saveRace(withContext(payload)))
    },
    [run, withContext]
  )
  const saveBackground = useCallback(
    async (payload: Omit<BackgroundStepRequest, keyof OnboardingContextRequest>) => {
      await run(() => readOnboardingApi().saveBackground(withContext(payload)))
    },
    [run, withContext]
  )
  const saveEquipment = useCallback(async () => {
    await run(() => readOnboardingApi().saveEquipment(withContext({})))
  }, [run, withContext])
  const saveCompanions = useCallback(
    async (payload: CompanionsStepPayload) => {
      await run(() =>
        readOnboardingApi().saveCompanions({ ...withContext({}), ...payload })
      )
    },
    [run, withContext]
  )
  return { saveMechanicalSetup, saveRace, saveBackground, saveEquipment, saveCompanions }
}

function useOnboardingFlowActions(
  state: WizardMutationState,
  run: (action: () => Promise<OnboardingSnapshot>) => Promise<OnboardingSnapshot>
) {
  const withContext = useOnboardingContext(state.request)
  const goBack = useCallback(async () => {
    await run(() => readOnboardingApi().goBack(withContext({})))
  }, [run, withContext])
  const startGuidedIdentity = useCallback(async () => {
    await run(() => readOnboardingApi().startGuidedIdentity(withContext({})))
  }, [run, withContext])
  const confirmOpeningScene = useCallback(async () => {
    await run(() => readOnboardingApi().confirmOpeningScene(withContext({})))
  }, [run, withContext])
  const rollAbilityScores = useCallback(async (): Promise<RolledAbilityScoreDraft | null> => {
    try {
      return await readOnboardingApi().rollAbilityScores()
    } catch (err: unknown) {
      state.setError(errorMessage(err))
      return null
    }
  }, [state])
  return { goBack, startGuidedIdentity, confirmOpeningScene, rollAbilityScores }
}

function useOnboardingChatActions(state: WizardMutationState) {
  const withContext = useOnboardingContext(state.request)
  const submitGuidedIdentity = useCallback(
    async (message: string) => {
      state.setBusy(true)
      state.setChatErrors([])
      try {
        const result = await readOnboardingApi().submitGuidedIdentity(
          withContext({ message }) as GuidedIdentityRequest
        )
        state.setSnapshot(result.snapshot)
        if (result.errors.length > 0) state.setChatErrors(result.errors)
      } catch (err: unknown) {
        state.setError(errorMessage(err))
      } finally {
        state.setBusy(false)
      }
    },
    [state, withContext]
  )
  const generateOpeningScene = useCallback(async () => {
    state.setBusy(true)
    state.setChatErrors([])
    try {
      const result = await readOnboardingApi().generateOpeningScene(withContext({}))
      state.setSnapshot(result.snapshot)
      if (result.errors.length > 0) state.setChatErrors(result.errors)
    } catch (err: unknown) {
      state.setError(errorMessage(err))
    } finally {
      state.setBusy(false)
    }
  }, [state, withContext])
  return { submitGuidedIdentity, generateOpeningScene }
}

function useOnboardingContext(request: BeginOnboardingRequest | null) {
  return useCallback(
    <T extends OnboardingContextRequest>(payload: Omit<T, keyof OnboardingContextRequest>) => {
      if (request === null) {
        throw new Error('Onboarding request is not ready.')
      }
      return { campaignId: request.campaignId, characterId: request.characterId, ...payload }
    },
    [request]
  )
}

function beginWizard(
  request: BeginOnboardingRequest,
  setSnapshot: (snapshot: OnboardingSnapshot) => void,
  setResources: (resources: WizardResources) => void,
  setError: (error: string | null) => void
): () => void {
  let cancelled = false
  void (async () => {
    try {
      const api = readOnboardingApi()
      const [snapshot, archetypes, races, backgrounds] = await Promise.all([
        api.begin(request),
        api.listArchetypes(),
        api.listRaces(request.campaignId),
        api.listBackgrounds(request.campaignId)
      ])
      if (cancelled) return
      setSnapshot(snapshot)
      setResources({ archetypes, races, backgrounds })
    } catch (err: unknown) {
      if (!cancelled) setError(errorMessage(err))
    }
  })()
  return () => {
    cancelled = true
  }
}

function readOnboardingApi(): OnboardingApi {
  return (window.aiTtrpg as GameApiWithOnboarding).onboarding
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Onboarding request failed'
}
