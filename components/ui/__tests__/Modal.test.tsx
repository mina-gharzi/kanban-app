// @vitest-environment jsdom
import { useState } from 'react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Modal from '../Modal'

// jsdom layout ندارد و `offsetParent` همیشه null است؛ useFocusTrap عنصرهای «نامرئی» را کنار می‌گذارد
// و بدون این شبیه‌سازی هیچ عنصری قابل‌فوکوس به حساب نمی‌آید (و تست‌ها کوری می‌شوند).
const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
    configurable: true,
    get() { return (this as HTMLElement).parentNode },
  })
})
afterAll(() => {
  if (originalOffsetParent) Object.defineProperty(HTMLElement.prototype, 'offsetParent', originalOffsetParent)
})

afterEach(() => {
  cleanup()
  document.body.style.overflow = ''
})

describe('Modal', () => {
  it('does not steal focus when the parent re-renders with a new onClose (e.g. a realtime update while typing)', () => {
    function Parent() {
      const [n, setN] = useState(0)
      return (
        <>
          <button onClick={() => setN(n + 1)}>rerender</button>
          {/* تابع جدید در هر رندر، مثل onClose={() => setOpenCardId(null)} در Board */}
          <Modal title="t" onClose={() => void n}>
            <input aria-label="first" />
            <textarea aria-label="typing" />
          </Modal>
        </>
      )
    }
    render(<Parent />)
    const textarea = screen.getByLabelText('typing')
    textarea.focus()
    expect(document.activeElement).toBe(textarea)

    fireEvent.click(screen.getByText('rerender'))
    fireEvent.click(screen.getByText('rerender'))

    expect(document.activeElement).toBe(textarea)
  })

  it('Escape in a nested dialog closes only the top one', () => {
    const closeOuter = vi.fn()
    const closeInner = vi.fn()
    render(
      <>
        <Modal title="outer" onClose={closeOuter}><button>outer-btn</button></Modal>
        <Modal title="inner" onClose={closeInner}><button>inner-btn</button></Modal>
      </>,
    )
    screen.getByText('inner-btn').focus()
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(closeInner).toHaveBeenCalledTimes(1)
    expect(closeOuter).not.toHaveBeenCalled()
  })

  it('never leaves the page scroll-locked after nested modals unmount together', () => {
    const { unmount } = render(
      <>
        <Modal title="a" onClose={() => {}}>a</Modal>
        <Modal title="b" onClose={() => {}}>b</Modal>
      </>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('keeps the lock while one of two modals is still open', () => {
    function Two({ showB }: { showB: boolean }) {
      return (
        <>
          <Modal title="a" onClose={() => {}}>a</Modal>
          {showB && <Modal title="b" onClose={() => {}}>b</Modal>}
        </>
      )
    }
    const { rerender } = render(<Two showB />)
    rerender(<Two showB={false} />)
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('does not close on Escape when not dismissible', () => {
    const close = vi.fn()
    render(<Modal title="t" onClose={close} dismissible><button>x</button></Modal>)
    cleanup()
    render(<Modal title="t" onClose={close} dismissible={false}><button>x</button></Modal>)
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
    expect(close).not.toHaveBeenCalled()
  })

  it('returns focus to the element that opened it', () => {
    function Host() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>open</button>
          {open && <Modal title="t" onClose={() => setOpen(false)}><button>inside</button></Modal>}
        </>
      )
    }
    render(<Host />)
    const opener = screen.getByText('open')
    opener.focus()
    fireEvent.click(opener)
    // فوکوس اولیه روی اولین عنصر قابل‌فوکوسِ پنل است (دکمه‌ی بستنِ سربرگ)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    fireEvent.keyDown(document.activeElement!, { key: 'Escape' })
    expect(document.activeElement).toBe(opener)
  })
})
