// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LocalModelInstallPanel } from './LocalModelInstallPanel.js'

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

function queryInput(host: HTMLElement, value: string): HTMLInputElement | null {
  return host.querySelector(`input[value="${value}"]`)
}

afterEach(() => {
  for (const root of roots) {
    act(() => root.unmount())
  }
  roots.length = 0
  document.body.innerHTML = ''
})

describe('LocalModelInstallPanel', () => {
  it('shows install status, progress, and disables choices while installing', () => {
    const host = renderElement(
      <LocalModelInstallPanel
        statusPhase="installing"
        statusText="Downloading model"
        progressPercent={42}
        backend="vulkan"
        onBackendChange={() => undefined}
        onInstall={() => undefined}
        installing={true}
      />
    )

    const gpu = queryInput(host, 'vulkan')
    const cpu = queryInput(host, 'cpu')
    const install = host.querySelector('button')
    const progress = host.querySelector('[role="progressbar"]')

    expect(host.textContent).toContain('Downloading model')
    expect(host.textContent).toContain('42%')
    expect(progress?.getAttribute('aria-valuenow')).toBe('42')
    expect(gpu?.disabled).toBe(true)
    expect(cpu?.disabled).toBe(true)
    expect(install?.hasAttribute('disabled')).toBe(true)
  })

  it('calls back with CPU when the CPU backend is selected', () => {
    const onBackendChange = vi.fn()
    const host = renderElement(
      <LocalModelInstallPanel
        statusPhase="missing"
        statusText="Model is missing"
        progressPercent={0}
        backend="vulkan"
        onBackendChange={onBackendChange}
        onInstall={() => undefined}
      />
    )

    const gpu = queryInput(host, 'vulkan')
    const cpu = queryInput(host, 'cpu')

    expect(gpu?.checked).toBe(true)
    expect(cpu?.checked).toBe(false)
    act(() => cpu?.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    expect(onBackendChange).toHaveBeenCalledWith('cpu')
  })
})
