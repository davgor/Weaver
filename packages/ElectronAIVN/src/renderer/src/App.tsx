import { useEffect, useState } from 'react'
import { LoadingScreen, Titlebar } from '@weaver/electron-ui'
import { APP_DISPLAY_NAME, BOOT_BRAND_TITLE } from '../../shared/appBranding'
import type {
  BootProgressUpdate,
  FirstRunSnapshot,
  StartupBootSnapshot,
  VnSavedGameSummary,
  VnStoryReviewSnapshot
} from '../../shared/gameApi'
import { HomeScreen } from './home/HomeScreen'
import { FirstRunOverlay } from './firstRun/FirstRunOverlay'
import { TellStoryForm } from './story/TellStoryForm'
import { StoryReview } from './story/StoryReview'
import {
  createTellStoryFormState,
  draftFromForm,
  type TellStoryFormState,
  validateTellStoryForm
} from './story/tellStoryFormState'
import { PlaySession } from './play/PlaySession'

const INITIAL_BOOT: StartupBootSnapshot = {
  phase: 'booting',
  progress: 0,
  stageLabel: 'Starting',
  statusText: 'Checking Weaver engines…',
  engineLabel: '…',
  failureMessage: null
}

type Screen =
  | { id: 'home' }
  | { id: 'form' }
  | { id: 'generating' }
  | { id: 'review'; review: VnStoryReviewSnapshot }
  | { id: 'play'; campaignId: string }

export function App(): JSX.Element {
  const { boot, retry } = useBootSnapshot()
  const gate = useStoryGate(boot.phase === 'ready')
  const nav = useAppNavigation(boot.phase === 'ready' && gate.canTellStory)

  return (
    <div className="app-root">
      <Titlebar
        brandTitle={APP_DISPLAY_NAME}
        onMinimize={() => window.aivn.windowControls.minimize()}
        onMaximize={() => window.aivn.windowControls.maximize()}
        onClose={() => window.aivn.windowControls.close()}
      />
      {boot.phase !== 'ready' ? (
        <LoadingScreen
          brandTitle={BOOT_BRAND_TITLE}
          stageLabel={boot.stageLabel}
          statusText={boot.statusText}
          progress={boot.progress}
          failureMessage={boot.failureMessage}
          onRetry={boot.phase === 'failed' ? retry : undefined}
        />
      ) : (
        <>
          <AppScreen gate={gate} nav={nav} />
          {gate.showFirstRun ? <FirstRunOverlay onComplete={gate.refresh} /> : null}
        </>
      )}
    </div>
  )
}

type Nav = ReturnType<typeof useAppNavigation>

function AppScreen(props: {
  gate: { canTellStory: boolean }
  nav: Nav
}): JSX.Element {
  const { screen, form, setForm, savedGames, busy, actions } = props.nav
  if (screen.id === 'play') {
    return <PlaySession campaignId={screen.campaignId} onHome={actions.goHome} />
  }
  if (screen.id === 'generating') {
    return (
      <LoadingScreen
        brandTitle={BOOT_BRAND_TITLE}
        stageLabel="Generating story"
        statusText="Drafting acts, cast, and opening beat…"
        progress={55}
      />
    )
  }
  if (screen.id === 'form') {
    return (
      <TellStoryForm
        state={form}
        onChange={setForm}
        busy={busy}
        onCancel={actions.goHome}
        onSubmit={actions.submitForm}
      />
    )
  }
  if (screen.id === 'review') {
    return (
      <StoryReview
        review={screen.review}
        busy={busy}
        onConfirm={actions.confirmReview}
        onPlay={actions.playStory}
        onBackToEdit={actions.backToEdit}
      />
    )
  }
  return (
    <HomeScreen
      canTellStory={props.gate.canTellStory}
      savedGames={savedGames}
      onTellStory={actions.startForm}
      onResume={actions.resume}
    />
  )
}

function useAppNavigation(canLoadSaves: boolean) {
  const [screen, setScreen] = useState<Screen>({ id: 'home' })
  const [form, setForm] = useState<TellStoryFormState>(createTellStoryFormState)
  const [savedGames, setSavedGames] = useState<VnSavedGameSummary[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!canLoadSaves) return
    void window.aivn.story.listSavedGames().then(setSavedGames)
  }, [canLoadSaves, screen.id])

  return {
    screen,
    form,
    setForm,
    savedGames,
    busy,
    actions: {
      goHome: () => setScreen({ id: 'home' }),
      startForm: () => {
        setForm(createTellStoryFormState())
        setScreen({ id: 'form' })
      },
      resume: (campaignId: string) => setScreen({ id: 'play', campaignId }),
      submitForm: () => void submitForm({ form, setForm, setBusy, setScreen }),
      confirmReview: () => void confirmReview(setScreen),
      playStory: () => void playStory(setBusy, setScreen),
      backToEdit: () => void backToEdit(setScreen)
    }
  }
}

async function submitForm(args: {
  form: TellStoryFormState
  setForm: (next: TellStoryFormState) => void
  setBusy: (busy: boolean) => void
  setScreen: (screen: Screen) => void
}): Promise<void> {
  const validated = validateTellStoryForm(args.form)
  args.setForm(validated)
  if (validated.error !== null) return
  args.setBusy(true)
  args.setScreen({ id: 'generating' })
  try {
    const review = await window.aivn.story.startGeneration(draftFromForm(validated))
    if (review.status === 'error') {
      args.setForm({ ...validated, error: review.errorMessage ?? 'Generation failed' })
      args.setScreen({ id: 'form' })
      return
    }
    args.setScreen({ id: 'review', review })
  } finally {
    args.setBusy(false)
  }
}

async function confirmReview(setScreen: (screen: Screen) => void): Promise<void> {
  const review = await window.aivn.story.confirmReview()
  setScreen({ id: 'review', review })
}

async function playStory(
  setBusy: (busy: boolean) => void,
  setScreen: (screen: Screen) => void
): Promise<void> {
  setBusy(true)
  try {
    const played = await window.aivn.story.play()
    setScreen({ id: 'play', campaignId: played.campaignId })
  } finally {
    setBusy(false)
  }
}

async function backToEdit(setScreen: (screen: Screen) => void): Promise<void> {
  await window.aivn.story.backToEdit()
  setScreen({ id: 'form' })
}

function useBootSnapshot(): {
  boot: StartupBootSnapshot
  retry: () => void
} {
  const [boot, setBoot] = useState<StartupBootSnapshot>(INITIAL_BOOT)

  useEffect(() => {
    const unsubscribe = window.aivn.startup.onBootProgress((update) => {
      setBoot((prev) => mergeBootProgress(prev, update))
    })
    void loadBoot(setBoot)
    return unsubscribe
  }, [])

  return {
    boot,
    retry: () => {
      void loadBoot(setBoot)
    }
  }
}

function useStoryGate(bootReady: boolean): {
  canTellStory: boolean
  showFirstRun: boolean
  refresh: () => void
} {
  const [intro, setIntro] = useState<FirstRunSnapshot | null>(null)

  useEffect(() => {
    if (!bootReady) return
    void window.aivn.firstRun.get().then(setIntro)
  }, [bootReady])

  const ready = intro?.ready === true
  const dismissed = intro?.dismissed === true
  return {
    canTellStory: ready && dismissed,
    showFirstRun: intro?.needed === true,
    refresh: () => {
      void window.aivn.firstRun.get().then(setIntro)
    }
  }
}

async function loadBoot(setBoot: (boot: StartupBootSnapshot) => void): Promise<void> {
  setBoot({ ...INITIAL_BOOT, progress: 10 })
  const next = await window.aivn.startup.getBoot()
  setBoot(next)
}

function mergeBootProgress(
  prev: StartupBootSnapshot,
  update: BootProgressUpdate
): StartupBootSnapshot {
  if (prev.phase === 'ready' || prev.phase === 'failed') return prev
  return {
    ...prev,
    phase: 'booting',
    progress: update.progress,
    stageLabel: update.stageLabel,
    statusText: update.statusText
  }
}
