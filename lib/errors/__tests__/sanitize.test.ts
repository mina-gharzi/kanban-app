import { describe, expect, it } from 'vitest'
import { REDACTED, isSensitiveKey, sanitizeForMonitoring, sanitizeString } from '../sanitize'

const asRecord = (value: unknown) => value as Record<string, unknown>

describe('isSensitiveKey', () => {
  it('flags credentials by key name', () => {
    for (const k of ['password', 'access_token', 'refreshToken', 'Authorization', 'apiKey', 'api-key',
      'client_secret', 'cookie', 'session', 'jwt', 'x-supabase-auth']) {
      expect(isSensitiveKey(k), k).toBe(true)
    }
  })
  it('leaves ordinary keys alone', () => {
    for (const k of ['title', 'boardId', 'position', 'email', 'role', 'message']) {
      expect(isSensitiveKey(k), k).toBe(false)
    }
  })
})

describe('sanitizeString', () => {
  it('redacts JWTs, bearer tokens, emails and new-style Supabase secret keys', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl'
    const out = sanitizeString(`t=${jwt} Bearer abc.def-123 mail me@x.com key sb_secret_AbC123_xyz-9`, 500)
    expect(out).not.toContain('eyJ')
    expect(out).not.toContain('abc.def-123')
    expect(out).not.toContain('me@x.com')
    expect(out).not.toContain('sb_secret_')
    expect(out).toContain(REDACTED)
  })
  it('keeps the public (publishable) key format readable', () => {
    expect(sanitizeString('sb_publishable_abc', 500)).toBe('sb_publishable_abc')
  })
  it('truncates long strings', () => {
    expect(sanitizeString('x'.repeat(600), 100)).toMatch(/…\[truncated\]$/)
  })
})

describe('sanitizeForMonitoring', () => {
  it('redacts sensitive keys at any depth and keeps the rest', () => {
    const out = asRecord(sanitizeForMonitoring({ board: 'b1', nested: { access_token: 'secret', title: 'ok' } }))
    const nested = asRecord(out.nested)
    expect(out.board).toBe('b1')
    expect(nested.access_token).toBe(REDACTED)
    expect(nested.title).toBe('ok')
  })
  it('survives circular references and caps depth and array size', () => {
    const a: Record<string, unknown> = { name: 'a' }
    a.self = a
    expect(asRecord(sanitizeForMonitoring(a)).self).toBe('[circular]')
    const deep = { l1: { l2: { l3: { l4: { l5: { l6: { l7: 1 } } } } } } }
    expect(JSON.stringify(sanitizeForMonitoring(deep))).toContain('[max depth]')
    const big = sanitizeForMonitoring(Array.from({ length: 100 }, (_, i) => i)) as unknown[]
    expect(big.length).toBe(41)
  })
  it('serialises Errors without leaking secrets from the message', () => {
    const err = new Error('failed for me@x.com with Bearer abc123')
    const out = sanitizeForMonitoring(err) as { name: string; message: string }
    expect(out.name).toBe('Error')
    expect(out.message).not.toContain('me@x.com')
    expect(out.message).not.toContain('abc123')
  })
  it('handles odd primitives', () => {
    expect(sanitizeForMonitoring(NaN)).toBe('NaN')
    expect(sanitizeForMonitoring(undefined)).toBeNull()
    expect(sanitizeForMonitoring(() => 1)).toBe('[function]')
    expect(sanitizeForMonitoring(BigInt(10))).toBe('10')
  })
})
