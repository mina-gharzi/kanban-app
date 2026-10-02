// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const setTheme = vi.fn()
let resolved: 'light' | 'dark' = 'light'
vi.mock('../ThemeProvider', () => ({ useTheme: () => ({ resolved, setTheme, theme: resolved }) }))

import ThemeToggle from '../ThemeToggle'

afterEach(() => { cleanup(); setTheme.mockClear(); resolved = 'light' })

describe('ThemeToggle', () => {
  it('shows both options and marks only the current one as pressed', () => {
    resolved = 'dark'
    render(<ThemeToggle />)
    expect(screen.getByLabelText('تم تاریک').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByLabelText('تم روشن').getAttribute('aria-pressed')).toBe('false')
  })
  it('switches to the clicked theme explicitly', () => {
    render(<ThemeToggle />)
    fireEvent.click(screen.getByLabelText('تم تاریک'))
    expect(setTheme).toHaveBeenCalledWith('dark')
    fireEvent.click(screen.getByLabelText('تم روشن'))
    expect(setTheme).toHaveBeenLastCalledWith('light')
  })
})
