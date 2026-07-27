// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FirstRunIntroShell } from './FirstRunIntroShell.js'

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

describe('FirstRunIntroShell', () => {
  it('renders supplied copy and slotted step content', () => {
    const host = renderElement(
      <FirstRunIntroShell title="Set up local play" lead="Choose a runtime path.">
        <p>Consumer-owned setup step</p>
      </FirstRunIntroShell>
    )

    expect(host.textContent).toContain('Set up local play')
    expect(host.textContent).toContain('Choose a runtime path.')
    expect(host.textContent).toContain('Consumer-owned setup step')
  })

  it('wires optional primary and secondary actions', () => {
    const onPrimary = vi.fn()
    const onSecondary = vi.fn()
    const host = renderElement(
      <FirstRunIntroShell
        title="Welcome"
        lead="Start setup."
        primaryAction={{ label: 'Continue', onClick: onPrimary }}
        secondaryAction={{ label: 'Skip', onClick: onSecondary, disabled: true }}
      />
    )

    const buttons = host.querySelectorAll('button')

    act(() => buttons[0]?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    act(() => buttons[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true })))

    expect(onPrimary).toHaveBeenCalledOnce()
    expect(onSecondary).not.toHaveBeenCalled()
    expect(buttons[1]?.hasAttribute('disabled')).toBe(true)
  })
})
