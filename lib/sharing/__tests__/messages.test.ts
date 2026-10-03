import { describe, expect, it } from 'vitest'
import { buildInviteMessage } from '../messages'

describe('buildInviteMessage', () => {
  const msg = buildInviteMessage({ boardTitle: 'پروژه', email: 'a@b.co', role: 'viewer', origin: 'https://app.example' })
  it('names the board, the role and the exact email to sign in with', () => {
    expect(msg).toContain('«پروژه»')
    expect(msg).toContain('«فقط‌خواندنی»')
    expect(msg).toContain('a@b.co')
  })
  it('points to the login page of the given origin', () => {
    expect(msg).toContain('https://app.example/login')
  })
})
