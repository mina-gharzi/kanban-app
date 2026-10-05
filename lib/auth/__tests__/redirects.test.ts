import { describe, expect, it } from 'vitest'
import { NextResponse } from 'next/server'
import { copyCookies, hasSessionCookie, isProtectedPath, loginPathFor, safeNextPath } from '../redirects'

describe('safeNextPath', () => {
  it('accepts internal paths, queries and hashes', () => {
    expect(safeNextPath('/board/abc')).toBe('/board/abc')
    expect(safeNextPath('/board/abc?x=1#y')).toBe('/board/abc?x=1#y')
  })
  it('falls back for empty and missing values', () => {
    expect(safeNextPath(null)).toBe('/boards')
    expect(safeNextPath('')).toBe('/boards')
  })
  it('rejects open-redirect attempts', () => {
    for (const bad of [
      'https://evil.com', 'http://evil.com', '//evil.com', '/\\evil.com', '/\\/evil.com',
      'javascript:alert(1)', '/\t/evil.com', '/\n/evil.com', 'evil.com', '///evil.com',
    ]) {
      expect(safeNextPath(bad), bad).toBe('/boards')
    }
  })
  it('never redirects back into the auth pages', () => {
    expect(safeNextPath('/login')).toBe('/boards')
    expect(safeNextPath('/login?next=/x')).toBe('/boards')
    expect(safeNextPath('/register')).toBe('/boards')
  })
  it('honours a custom fallback', () => {
    expect(safeNextPath('https://evil.com', '/')).toBe('/')
  })
})

describe('isProtectedPath', () => {
  it('covers the board routes only', () => {
    for (const p of ['/board', '/boards', '/board/123', '/boards/x', '/account', '/account/x']) expect(isProtectedPath(p), p).toBe(true)
    for (const p of ['/', '/login', '/register', '/privacy', '/terms', '/boardgames', '/boarding', '/accounting']) expect(isProtectedPath(p), p).toBe(false)
  })
})

describe('loginPathFor', () => {
  it('encodes the original target', () => {
    expect(loginPathFor('/board/abc', '?x=1')).toBe('/login?next=%2Fboard%2Fabc%3Fx%3D1')
  })
})

describe('copyCookies', () => {
  it('keeps refreshed session cookies (with options) on the redirect', () => {
    const from = NextResponse.next()
    from.cookies.set('sb-access-token', 'new', { httpOnly: true, path: '/', maxAge: 3600 })
    const to = copyCookies(from, NextResponse.redirect('http://localhost/boards'))
    const c = to.cookies.get('sb-access-token')
    expect(c?.value).toBe('new')
    expect(c?.httpOnly).toBe(true)
    expect(c?.maxAge).toBe(3600)
  })
})

describe('hasSessionCookie', () => {
  it('detects Supabase session cookies, including chunked ones', () => {
    expect(hasSessionCookie(['sb-abcd1234-auth-token'])).toBe(true)
    expect(hasSessionCookie(['theme', 'sb-abcd1234-auth-token.0', 'sb-abcd1234-auth-token.1'])).toBe(true)
  })
  it('ignores everything else, including the PKCE code-verifier cookie', () => {
    expect(hasSessionCookie([])).toBe(false)
    expect(hasSessionCookie(['theme', 'kanban-theme'])).toBe(false)
    expect(hasSessionCookie(['sb-abcd1234-auth-token-code-verifier'])).toBe(false)
    expect(hasSessionCookie(['xsb-abcd-auth-token'])).toBe(false)
  })
})
