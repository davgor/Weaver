import { useEffect, useState } from 'react'
import { LoadingScreen, Titlebar } from '@weaver/electron-ui'
import { APP_DISPLAY_NAME } from '../../shared/appBranding'
import type { StartupBootSnapshot } from '../../shared/gameApi'
import { EmptyHome } from './home/EmptyHome'

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
          brandTitle={APP_DISPLAY_NAME}
          stageLabel={boot.stageLabel}
          statusText={boot.statusText}
          progress={boot.progress}
          failureMessage={boot.failureMessage}
          onRetry={boot.phase === 'failed' ? retry : undefined}
        />
      ) : (
        <EmptyHome />
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
    void loadBoot(setBoot)
  }, [])

  return {
    boot,
    retry: () => {
      void loadBoot(setBoot)
    }
  }
}

async function loadBoot(setBoot: (boot: StartupBootSnapshot) => void): Promise<void> {
  setBoot({ ...INITIAL_BOOT, progress: 20 })
  const next = await window.aivn.startup.getBoot()
  setBoot(next)
}
