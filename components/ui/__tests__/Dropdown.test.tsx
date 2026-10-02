// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Dropdown from '../Dropdown'

afterEach(cleanup)

function setup(onSelect = vi.fn()) {
  render(
    <Dropdown
      label="منو"
      header={<p>me@example.com</p>}
      items={[
        { label: 'اول', onSelect },
        { label: 'خروج', onSelect: vi.fn(), tone: 'danger' },
      ]}
      trigger={(props) => <button {...props}>باز</button>}
    />,
  )
  fireEvent.click(screen.getByText('باز'))
  return onSelect
}

describe('Dropdown header', () => {
  it('shows the identity block and a separator, but only real items are menu items', () => {
    setup()
    expect(screen.getByText('me@example.com')).toBeTruthy()
    expect(screen.getByRole('separator')).toBeTruthy()
    expect(screen.getAllByRole('menuitem').map((n) => n.textContent)).toEqual(['اول', 'خروج'])
  })
  it('does not render a header or separator when none is given', () => {
    render(<Dropdown label="m" items={[{ label: 'x', onSelect: () => {} }]} trigger={(p) => <button {...p}>t</button>} />)
    fireEvent.click(screen.getByText('t'))
    expect(screen.queryByRole('separator')).toBeNull()
  })
  it('selecting an item runs it and closes the menu', () => {
    const onSelect = setup()
    fireEvent.click(screen.getByText('اول'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).toBeNull()
  })
  it('arrow keys still move between items (the header is not focusable)', () => {
    setup()
    const items = screen.getAllByRole('menuitem')
    items[0]!.focus()
    fireEvent.keyDown(items[0]!, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(items[1])
  })
})
