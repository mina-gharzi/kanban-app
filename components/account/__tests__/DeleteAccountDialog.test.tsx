// @vitest-environment jsdom
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axe from 'axe-core'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'

const replace = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }) }))
const getDeletionPreview = vi.fn()
const deleteMyAccount = vi.fn()
vi.mock('@/lib/supabase/account', () => ({
  getDeletionPreview: (...a: unknown[]) => getDeletionPreview(...a),
  deleteMyAccount: (...a: unknown[]) => deleteMyAccount(...a),
  exportMyData: vi.fn(),
}))

import DeleteAccountDialog from '../DeleteAccountDialog'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent')
beforeAll(() => { Object.defineProperty(HTMLElement.prototype, 'offsetParent', { configurable: true, get() { return (this as HTMLElement).parentNode } }) })
afterAll(() => { if (original) Object.defineProperty(HTMLElement.prototype, 'offsetParent', original) })
afterEach(() => { cleanup(); vi.clearAllMocks(); document.body.style.overflow = '' })

const withShared = { solo_boards: 2, memberships: 1, shared_boards: [{ board_id: 'b1', title: 'پروژه', members: 2, new_owner_email: 'editor@x.com' }] }
const noShared = { solo_boards: 1, memberships: 0, shared_boards: [] }

function renderDialog(preview: unknown) {
  getDeletionPreview.mockResolvedValue(preview)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><DeleteAccountDialog onClose={() => {}} /></QueryClientProvider>)
}
const deleteButton = () => screen.getByRole('button', { name: 'حذف دائمی حساب' }) as HTMLButtonElement
async function ready() { await screen.findByText(/حساب و ایمیل شما برای همیشه پاک می‌شود/) }
async function fill(password = 'pw') {
  fireEvent.change(screen.getByLabelText(/رمز عبورتان/), { target: { value: password } })
  fireEvent.click(screen.getByLabelText(/قابل بازگشت نیست/))
}

describe('DeleteAccountDialog', () => {
  it('shows what will happen, including who inherits each shared board', async () => {
    renderDialog(withShared)
    await ready()
    expect(screen.getByText(/2 بورد|۲ بورد/)).toBeTruthy()
    expect(screen.getByText(/editor@x\.com/)).toBeTruthy()
    expect(screen.getByRole('radio', { name: /انتقال مالکیت/ }).hasAttribute('checked') || (screen.getByRole('radio', { name: /انتقال مالکیت/ }) as HTMLInputElement).checked).toBe(true)
  })

  it('stays disabled until the password is typed AND the warning is acknowledged', async () => {
    renderDialog(withShared)
    await ready()
    expect(deleteButton().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText(/رمز عبورتان/), { target: { value: 'pw' } })
    expect(deleteButton().disabled).toBe(true)
    fireEvent.click(screen.getByLabelText(/قابل بازگشت نیست/))
    expect(deleteButton().disabled).toBe(false)
  })

  it('sends the chosen policy and the password, then leaves the app', async () => {
    deleteMyAccount.mockResolvedValue(undefined)
    renderDialog(withShared)
    await ready()
    fireEvent.click(screen.getByRole('radio', { name: /حذف این بوردها برای همه/ }))
    await fill('secret-pw')
    fireEvent.click(deleteButton())
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledWith('secret-pw', 'delete'))
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'))
  })

  it('defaults to transfer, and without shared boards offers no choice at all', async () => {
    deleteMyAccount.mockResolvedValue(undefined)
    renderDialog(noShared)
    await ready()
    expect(screen.queryByRole('radio')).toBeNull()
    await fill()
    fireEvent.click(deleteButton())
    await waitFor(() => expect(deleteMyAccount).toHaveBeenCalledWith('pw', 'transfer'))
  })

  it('on a wrong password: announces it, clears the field, does not leave', async () => {
    deleteMyAccount.mockRejectedValue(new AppError({ code: ERROR_CODES.VALIDATION, message: 'x', userMessage: 'رمز عبور درست نیست.', retryable: false }))
    renderDialog(noShared)
    await ready()
    await fill('bad')
    fireEvent.click(deleteButton())
    expect((await screen.findByRole('alert')).textContent).toContain('رمز عبور درست نیست.')
    expect((screen.getByLabelText(/رمز عبورتان/) as HTMLInputElement).value).toBe('')
    expect(replace).not.toHaveBeenCalled()
  })

  it('offers a retry when the preview cannot be loaded, and never allows deleting blind', async () => {
    getDeletionPreview.mockRejectedValue(new Error('boom'))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><DeleteAccountDialog onClose={() => {}} /></QueryClientProvider>)
    expect((await screen.findByRole('alert')).textContent).toContain('تلاش دوباره')
    expect(deleteButton().disabled).toBe(true)
  })

  it('has no automatic accessibility violations', async () => {
    renderDialog(withShared)
    await ready()
    await fill()
    const r = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('|')}`)).toEqual([])
  })
})
