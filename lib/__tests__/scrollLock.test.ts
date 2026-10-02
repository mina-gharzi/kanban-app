// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { lockBodyScroll } from '../scrollLock'

afterEach(() => { document.body.style.overflow = '' })

describe('lockBodyScroll', () => {
  it('restores the ORIGINAL overflow only when the last lock is released, in any release order', () => {
    document.body.style.overflow = 'auto'
    const a = lockBodyScroll()
    const b = lockBodyScroll()
    expect(document.body.style.overflow).toBe('hidden')
    a() // اولی زودتر آزاد می‌شود
    expect(document.body.style.overflow).toBe('hidden')
    b()
    expect(document.body.style.overflow).toBe('auto')
  })
  it('release is idempotent', () => {
    const a = lockBodyScroll()
    const b = lockBodyScroll()
    a(); a(); a()
    expect(document.body.style.overflow).toBe('hidden')
    b()
    expect(document.body.style.overflow).toBe('')
  })
})
