// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import PrivacyPage from '@/app/privacy/page'
import TermsPage from '@/app/terms/page'

afterEach(cleanup)
const pages = [['privacy', PrivacyPage], ['terms', TermsPage]] as const

describe.each(pages)('%s page', (_name, Page) => {
  it('has one h1, a table of contents that links to every section, and an h2 per section', () => {
    render(<Page />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const toc = screen.getByRole('navigation', { name: 'فهرست مطالب' })
    const links = Array.from(toc.querySelectorAll('a'))
    expect(links.length).toBeGreaterThanOrEqual(8)
    for (const a of links) {
      const target = document.querySelector(a.getAttribute('href')!)
      expect(target, a.getAttribute('href')!).toBeTruthy()
      expect(target!.querySelector('h2')).toBeTruthy()
    }
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBe(links.length)
  })
  it('has the skip-link target and warns while the legal details are not filled in', () => {
    render(<Page />)
    expect(document.getElementById('main-content')?.tagName).toBe('MAIN')
    expect(screen.getByRole('note').textContent).toContain('ناقص')
  })
  it('has no automatic accessibility violations', async () => {
    render(<Page />)
    const r = await axe.run(document.body, { rules: { 'color-contrast': { enabled: false }, region: { enabled: false } } })
    expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join('|')}`)).toEqual([])
  })
})

describe('privacy page content matches what the product really does', () => {
  it('mentions each kind of data and the user-facing controls the app actually offers', () => {
    render(<PrivacyPage />)
    const text = document.body.textContent ?? ''
    for (const needle of ['ایمیل', 'رمز عبور', 'کوکی نشست', 'kanban-theme', 'Supabase', 'Vercel', 'حذف حساب', 'JSON', 'منتقل']) expect(text, needle).toContain(needle)
    expect(document.querySelector('a[href="/account"]')).toBeTruthy()
  })
})
