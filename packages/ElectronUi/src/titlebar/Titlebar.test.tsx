// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Titlebar } from './Titlebar.js'
import { TITLEBAR_DRAG_REGION_CLASS, TITLEBAR_NO_DRAG_CLASS } from './titlebarRegions.js'

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

function clickButton(host: HTMLElement, label: string): void {
  const button = host.querySelector(`button[aria-label="${label}"]`)
  act(() => button?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

afterEach(() => {
  for (const root of roots) {
    act(() => root.unmount())
  }
  roots.length = 0
  document.body.innerHTML = ''
})

describe('Titlebar', () => {
  it('renders brand content inside the drag region', () => {
    const host = renderElement(<Titlebar brandTitle="Shared Chrome" />)
    const dragRegion = host.querySelector(`.${TITLEBAR_DRAG_REGION_CLASS}`)

    expect(dragRegion?.textContent).toContain('Shared Chrome')
    expect(host.querySelector(`.${TITLEBAR_NO_DRAG_CLASS}`)).not.toBeNull()
  })

  it('uses slotted brand content when children are supplied', () => {
    const host = renderElement(<Titlebar>Custom Brand Slot</Titlebar>)

    expect(host.textContent).toContain('Custom Brand Slot')
  })

  it('wires window control and optional settings callbacks', () => {
    const onClose = vi.fn()
    const onMaximize = vi.fn()
    const onMinimize = vi.fn()
    const onOpenSettings = vi.fn()
    const host = renderElement(
      <Titlebar
        brandTitle="Weaver"
        onClose={onClose}
        onMaximize={onMaximize}
        onMinimize={onMinimize}
        onOpenSettings={onOpenSettings}
      />
    )

    clickButton(host, 'Open settings')
    clickButton(host, 'Minimize')
    clickButton(host, 'Maximize')
    clickButton(host, 'Close')

    expect(onOpenSettings).toHaveBeenCalledOnce()
    expect(onMinimize).toHaveBeenCalledOnce()
    expect(onMaximize).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })
})
