import { useEffect, useState } from 'react'
import { LoadingScreen, Titlebar } from '@weaver/electron-ui'
import { APP_DISPLAY_NAME, BOOT_BRAND_TITLE } from '../../shared/appBranding'
import type { BootProgressUpdate, FirstRunSnapshot, StartupBootSnapshot } from '../../shared/gameApi'
import { EmptyHome } from './home/EmptyHome'
import { FirstRunOverlay } from './firstRun/FirstRunOverlay'

const INITIAL_BOOT: StartupBootSnapshot = {
  phase: 'booting',
  progress: 0,
  stageLabel: 'Starting',
  statusText: 'Checking Weaver engines…',
  engineLabel: '…',
  failureMessage: null
}

export function App(): JSX.Element {
  const { boot, retry } = useBootSnapshot()
  const gate = useStoryGate(boot.phase === 'ready')

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
          <EmptyHome canTellStory={gate.canTellStory} />
          {gate.showFirstRun ? <FirstRunOverlay onComplete={gate.refresh} /> : null}
        </>
      )}
    </div>
  )
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
