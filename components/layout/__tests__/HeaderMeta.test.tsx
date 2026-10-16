// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const pathname = vi.fn()
vi.mock('next/navigation', () => ({ usePathname: () => pathname() }))

const useBoards = vi.fn()
vi.mock('@/hooks/useBoards', () => ({ useBoards: () => useBoards() }))

import HeaderMeta from '../HeaderMeta'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function withBoards(boards: { id: string; title: string }[]) {
  useBoards.mockReturnValue({ boards })
}

describe('HeaderMeta', () => {
  it('labels the boards list route', () => {
    pathname.mockReturnValue('/boards')
    withBoards([])

    render(<HeaderMeta />)

    expect(screen.getByText('بوردهای من')).toBeTruthy()
  })

  it('labels the account route', () => {
    pathname.mockReturnValue('/account')
    withBoards([])

    render(<HeaderMeta />)

    expect(screen.getByText('حساب کاربری')).toBeTruthy()
  })

  it('shows the current board title once it is known', () => {
    pathname.mockReturnValue('/board/b1')
    withBoards([{ id: 'b1', title: 'پروژه‌ی فصل' }])

    render(<HeaderMeta />)

    expect(screen.getByText('پروژه‌ی فصل')).toBeTruthy()
  })

  it('renders nothing while the board title is still unknown', () => {
    pathname.mockReturnValue('/board/b1')
    withBoards([])

    const { container } = render(<HeaderMeta />)

    // `null` برمی‌گرداند تا `empty:hidden` در AppHeader کل ناحیه را پنهان کند
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing on routes without a header title', () => {
    pathname.mockReturnValue('/privacy')
    withBoards([])

    const { container } = render(<HeaderMeta />)

    expect(container.innerHTML).toBe('')
  })
})
