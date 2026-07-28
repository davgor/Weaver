// @vitest-environment happy-dom
import { act, type ReactElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import type { VnBeatPlaceholder } from '@weaver/narration-engine'
import type { VnSlotAssetState } from '../../../shared/play/assetTypes'
import { PlaceholderLayer } from './PlaceholderLayer'

const roots: Root[] = []
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function render(element: ReactElement): HTMLElement {
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
  act(() => {
    for (const root of roots.splice(0)) root.unmount()
  })
  document.body.innerHTML = ''
})

const placeholders: readonly VnBeatPlaceholder[] = [
  { slot: 'mc', label: 'MC label', fullPrompt: 'A weary ranger, no background' },
  { slot: 'background', label: 'BG label', fullPrompt: 'A foggy dock at dusk' }
]

describe('PlaceholderLayer', () => {
  it('shows prompt text when no assets are provided', () => {
    const host = render(<PlaceholderLayer placeholders={placeholders} mode="scene" />)
    expect(host.textContent).toContain('A weary ranger, no background')
    expect(host.querySelector('img')).toBeNull()
  })

  it('renders an image when a slot asset is ready', () => {
    const assets: VnSlotAssetState[] = [
      {
        slot: 'mc',
        status: 'ready',
        label: 'MC label',
        fullPrompt: 'A weary ranger, no background',
        imagePath: '/tmp/mc.png'
      },
      { slot: 'background', status: 'loading', label: 'BG label', fullPrompt: 'A foggy dock at dusk' }
    ]
    const host = render(
      <PlaceholderLayer placeholders={placeholders} mode="scene" assets={assets} />
    )
    const img = host.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toContain('mc.png')
  })

  it('keeps the prompt text visible for failed slots (126.5)', () => {
    const assets: VnSlotAssetState[] = [
      { slot: 'mc', status: 'failed', label: 'MC label', fullPrompt: 'A weary ranger, no background' },
      { slot: 'background', status: 'failed', label: 'BG label', fullPrompt: 'A foggy dock at dusk' }
    ]
    const host = render(
      <PlaceholderLayer placeholders={placeholders} mode="scene" assets={assets} />
    )
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toContain('A weary ranger, no background')
    expect(host.textContent).toContain('A foggy dock at dusk')
  })
})
