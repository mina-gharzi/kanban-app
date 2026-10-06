// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import PrivacyPage from '@/app/privacy/page'
import TermsPage from '@/app/terms/page'

afterEach(cleanup)

const pages = [
  ['privacy', PrivacyPage],
  ['terms', TermsPage],
] as const

describe.each(pages)('%s page', (_name, Page) => {
  it('has one h1, a table of contents that links to every section, and an h2 per section', () => {
    render(<Page />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)

    const toc = screen.getByRole('navigation', {
      name: 'فهرست مطالب',
    })

    const links = Array.from(toc.querySelectorAll('a'))

    expect(links.length).toBeGreaterThanOrEqual(8)

    for (const link of links) {
      const href = link.getAttribute('href')
      expect(href).toBeTruthy()

      const target = document.querySelector(href!)
      expect(target, href!).toBeTruthy()
      expect(target!.querySelector('h2')).toBeTruthy()
    }

    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(
      links.length,
    )
  })

  it('has the skip-link target', () => {
    render(<Page />)

    const main = document.getElementById('main-content')

    expect(main).toBeTruthy()
    expect(main?.tagName).toBe('MAIN')
    expect(main?.getAttribute('tabindex')).toBe('-1')
  })

  it('has no automatic accessibility violations', async () => {
    render(<Page />)

    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })

    expect(
      result.violations.map(
        (violation) =>
          `${violation.id}: ${violation.nodes
            .map((node) => node.target.join(' '))
            .join('|')}`,
      ),
    ).toEqual([])
  })
})

describe('privacy page content matches what the product really does', () => {
  it('mentions each kind of data and the user-facing controls the app actually offers', () => {
    render(<PrivacyPage />)

    const text = document.body.textContent ?? ''

    for (const needle of [
      'ایمیل',
      'رمز عبور',
      'کوکی نشست',
      'kanban-theme',
      'Supabase',
      'Vercel',
      'حذف حساب',
      'JSON',
      'منتقل',
    ]) {
      expect(text, needle).toContain(needle)
    }

    expect(document.querySelector('a[href="/account"]')).toBeTruthy()
  })
})