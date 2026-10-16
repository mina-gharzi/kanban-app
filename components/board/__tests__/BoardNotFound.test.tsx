// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import BoardNotFound from '../BoardNotFound'

afterEach(cleanup)

describe('BoardNotFound', () => {
  it('explains the state and links back to the board list', () => {
    render(<BoardNotFound />)

    expect(screen.getByText('این بورد پیدا نشد')).toBeTruthy()
    const link = screen.getByRole('link', { name: 'بازگشت به بوردها' })
    expect(link.getAttribute('href')).toBe('/boards')
  })
})
