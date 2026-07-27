// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LoadingScreen } from './LoadingScreen.js'

const roots: Root[] = []
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function renderElement(element: ReactElement): HTMLElement {
  const host = document.createElement('div')
  document.body.append(host)
  act(() => {
    const root = createRoot(host)
    roots.push(root)
    root.render(element)
  })
  return host
}

afterEach(() => {
  for (const root of roots) {
    act(() => root.unmount())
  }
  roots.length = 0
  document.body.innerHTML = ''
})

describe('LoadingScreen', () => {
  it('renders brand, stage, status, and boot progress', () => {
    const host = renderElement(
      <LoadingScreen
        brandTitle="AI VN"
        stageLabel="Preparing runtime"
        statusText="Opening campaign database"
        progress={32}
      />
    )

    const progress = host.querySelector('[role="progressbar"]')
    const fill = host.querySelector('.loading-screen-progress-fill') as HTMLElement | null

    expect(host.textContent).toContain('AI VN')
    expect(host.textContent).toContain('Preparing runtime')
    expect(host.textContent).toContain('Opening campaign database')
    expect(progress?.getAttribute('aria-valuenow')).toBe('32')
    expect(fill?.style.width).toBe('32%')
  })

  it('presents the ready state when progress reaches 100', () => {
    const host = renderElement(
      <LoadingScreen
        brandTitle="AI TTRPG"
        stageLabel="Ready"
        statusText="Entering the table"
        progress={100}
      />
    )

    const panel = host.querySelector('.loading-screen-panel')
    const progress = host.querySelector('[role="progressbar"]')

    expect(panel?.getAttribute('data-state')).toBe('ready')
    expect(progress?.getAttribute('aria-valuenow')).toBe('100')
    expect(host.textContent).toContain('Entering the table')
  })

  it('shows failure message and optional retry action', () => {
    const onRetry = vi.fn()
    const host = renderElement(
      <LoadingScreen
        brandTitle="Weaver"
        stageLabel="Startup interrupted"
        statusText="Runtime failed"
        progress={45}
        failureMessage="Model runtime could not start."
        onRetry={onRetry}
      />
    )

    const retry = host.querySelector('button')

    expect(host.querySelector('[role="progressbar"]')).toBeNull()
    expect(host.textContent).toContain('Model runtime could not start.')
    act(() => retry?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onRetry).toHaveBeenCalledOnce()
  })
})
