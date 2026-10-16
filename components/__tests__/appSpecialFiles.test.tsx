// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import NotFound from '@/app/not-found'
import GlobalError from '@/app/global-error'

afterEach(cleanup)

describe('app/not-found', () => {
  it('explains the missing route and links to safe destinations', () => {
    render(<NotFound />)

    expect(screen.getByText('این صفحه پیدا نشد')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'رفتن به بوردها' }).getAttribute('href')).toBe(
      '/boards'
    )
    expect(screen.getByRole('link', { name: 'صفحه‌ی اصلی' }).getAttribute('href')).toBe('/')
  })
})

describe('app/global-error', () => {
  // global-error در سطح ریشه رندر می‌شود؛ Testing Library که داخل یک <div>
  // mount می‌کند تگ‌های <html>/<head>/<body> را حذف می‌کند، پس ساختار سند را
  // با خروجی Server render بررسی می‌کنیم.
  it('renders its own RTL document, head styles and body', () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error('x')} retry={() => {}} />
    )

    expect(html).toContain('lang="fa"')
    expect(html).toContain('dir="rtl"')
    expect(html).toMatch(/<head>[\s\S]*<style>/)
    expect(html).toContain('<body>')
  })

  it('shows a safe message and never leaks raw error details', () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error('SENSITIVE internal detail')} retry={() => {}} />
    )

    expect(html).toContain('مشکلی پیش آمده است')
    expect(html).not.toContain('SENSITIVE')
  })

  it('calls retry when the retry action is pressed', () => {
    const retry = vi.fn()
    render(<GlobalError error={new Error('x')} retry={retry} />)

    fireEvent.click(screen.getByRole('button', { name: 'تلاش دوباره' }))
    expect(retry).toHaveBeenCalledTimes(1)
  })
})
