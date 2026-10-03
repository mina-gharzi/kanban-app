// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'

vi.mock('@/components/layout/ThemeProvider', () => ({ useTheme: () => ({ resolved: 'light', theme: 'light', setTheme: () => {} }) }))
vi.mock('../layout/ThemeProvider', () => ({ useTheme: () => ({ resolved: 'light', theme: 'light', setTheme: () => {} }) }))

import AuthCard from '../auth/AuthCard'
import SkipLink from '../SkipLink'
import ThemeToggle from '../layout/ThemeToggle'
import TryBoard from '../landing/TryBoard'
import Dropdown from '../ui/Dropdown'
import Field from '../ui/Field'
import Input from '../ui/Input'
import Modal from '../ui/Modal'
import ConfirmDialog from '../ui/ConfirmDialog'
import Button from '../ui/Button'

// jsdom بدون layout است: `offsetParent` را برای useFocusTrap شبیه‌سازی می‌کنیم؛
// قاعده‌های رنگ/ناحیه (نیازمند رندر واقعی) را خاموش می‌کنیم؛ کنتراست رنگ را
// تست designTokens از روی توکن‌ها می‌سنجد.
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return (this as HTMLElement).parentNode } })
})
afterAll(() => { if (original) Object.defineProperty(HTMLElement.prototype, 'offsetParent', original) })
afterEach(() => { cleanup(); document.body.style.overflow = '' })

async function violations(root: Element = document.body) {
  const result = await axe.run(root, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return result.violations.map((v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)
}

describe('axe: no automatic WCAG violations', () => {
  it('skip link', async () => {
    render(<><SkipLink /><main id="main-content">x</main></>)
    expect(await violations()).toEqual([])
  })
  it('theme switch', async () => {
    render(<ThemeToggle />)
    expect(await violations()).toEqual([])
  })
  it('auth card with a form, a label and an error', async () => {
    render(
      <AuthCard title="ورود" subtitle="خوش آمدید" footerLink={{ href: '/register', label: 'ثبت‌نام' }}>
        <form>
          <Field id="email" label="ایمیل" error="ایمیل معتبر نیست">
            {({ id, describedBy, invalid }) => <Input id={id} aria-describedby={describedBy} invalid={invalid} type="email" />}
          </Field>
          <Button type="submit">ورود</Button>
        </form>
      </AuthCard>,
    )
    expect(await violations()).toEqual([])
    const input = screen.getByLabelText(/ایمیل/)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
  })
  it('open dropdown menu with identity header', async () => {
    render(<Dropdown label="منوی کاربر" header={<p>me@x.com</p>} items={[{ label: 'خروج', onSelect: () => {} }]} trigger={(p) => <button {...p} aria-label="منوی کاربر">m</button>} />)
    fireEvent.click(screen.getByLabelText('منوی کاربر'))
    expect(await violations()).toEqual([])
  })
  it('modal and nested confirm dialog', async () => {
    render(
      <>
        <Modal title="کارت" onClose={() => {}}><label>عنوان<input /></label></Modal>
        <ConfirmDialog title="حذف" description="مطمئنید؟" confirmLabel="حذف" onCancel={() => {}} onConfirm={() => {}} />
      </>,
    )
    expect(await violations()).toEqual([])
  })
  it('landing demo board: named groups, progressbar, named card buttons', async () => {
    render(<TryBoard />)
    expect(await violations()).toEqual([])
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBeTruthy()
    expect(screen.getAllByRole('group').length).toBeGreaterThanOrEqual(3)
    for (const b of screen.getAllByRole('button')) expect(b.getAttribute('aria-label') ?? b.textContent).toBeTruthy()
  })
})
