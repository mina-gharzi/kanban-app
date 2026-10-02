import { describe, expect, it } from 'vitest'
import { permissionsFor, resolveBoardRole } from '../roles'
import { sharingErrorMessage } from '../errors'

describe('permissionsFor', () => {
  it('owner and editor can edit, only the owner manages', () => {
    expect(permissionsFor('owner')).toEqual({ role: 'owner', canEdit: true, isOwner: true })
    expect(permissionsFor('editor')).toEqual({ role: 'editor', canEdit: true, isOwner: false })
    expect(permissionsFor('viewer')).toEqual({ role: 'viewer', canEdit: false, isOwner: false })
  })
})

describe('resolveBoardRole', () => {
  it('owner when created_by is me, regardless of memberships', () => {
    expect(resolveBoardRole({ created_by: 'u1' }, 'u1', undefined)).toBe('owner')
    expect(resolveBoardRole({ created_by: 'u1' }, 'u1', 'viewer')).toBe('owner')
  })
  it('uses the membership role for other people\'s boards', () => {
    expect(resolveBoardRole({ created_by: 'u1' }, 'u2', 'editor')).toBe('editor')
    expect(resolveBoardRole({ created_by: 'u1' }, 'u2', 'viewer')).toBe('viewer')
  })
  it('fails safe: no created_by and no membership is viewer, never owner', () => {
    expect(resolveBoardRole({}, 'u2', undefined)).toBe('viewer')
    expect(resolveBoardRole({ created_by: null }, 'u2', undefined)).toBe('viewer')
    expect(resolveBoardRole({ created_by: 'u1' }, 'u2', undefined)).toBe('viewer')
  })
})

describe('sharingErrorMessage', () => {
  it('maps every RPC error the migration can raise', () => {
    for (const raw of [
      'invite_to_board: invalid email', 'invite_to_board: you are the owner',
      'invite_to_board: already a member', 'invite_to_board: too many pending invites',
      'invite_to_board: only the board owner can invite', 'invite_to_board: invalid role',
      'accept_board_invite: confirm your email first', 'accept_board_invite: invite not found',
      'invite_to_board: not authenticated',
    ]) {
      expect(sharingErrorMessage(raw), raw).toMatch(/[\u0600-\u06FF]/)
    }
  })
  it('returns null for unknown or empty messages', () => {
    expect(sharingErrorMessage('connection reset')).toBeNull()
    expect(sharingErrorMessage('')).toBeNull()
    expect(sharingErrorMessage(undefined)).toBeNull()
  })
})
