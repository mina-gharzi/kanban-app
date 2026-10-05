import { describe, expect, it } from 'vitest'
import { accountErrorMessage } from '../errors'
import { buildAccountExport } from '../export'
import type { Card, Column } from '@/lib/board/types'

describe('accountErrorMessage', () => {
  it('maps every error the RPC can raise to Persian', () => {
    for (const raw of ['delete_my_account: wrong password', 'delete_my_account: account has no password',
      'delete_my_account: invalid shared_boards option', 'account: not authenticated']) {
      expect(accountErrorMessage(raw), raw).toMatch(/[\u0600-\u06FF]/)
    }
  })
  it('returns null for anything else', () => {
    expect(accountErrorMessage('network down')).toBeNull()
    expect(accountErrorMessage(undefined)).toBeNull()
  })
})

describe('buildAccountExport', () => {
  const col = (id: string, position: number): Column => ({ id, board_id: 'b', title: `col-${id}`, position })
  const card = (id: string, column_id: string, position: number): Card => ({
    id, column_id, position, title: `card-${id}`, description: 'd', created_at: 't', label_color: 'red', due_date: null,
  })
  const out = buildAccountExport({
    email: 'me@x.com',
    exportedAt: new Date('2026-10-04T10:00:00Z'),
    boards: [{ id: 'b', title: 'B', created_at: 'c', role: 'editor',
      data: { columns: [col('c2', 1), col('c1', 0)], cards: [card('k2', 'c1', 5), card('k1', 'c1', 1), card('k3', 'c2', 0)] } }],
  })

  it('has a stable format and metadata', () => {
    expect(out.format).toBe('kanban-export-v1')
    expect(out.exported_at).toBe('2026-10-04T10:00:00.000Z')
    expect(out.account).toEqual({ email: 'me@x.com' })
    expect(out.boards[0]!.my_role).toBe('editor')
  })
  it('keeps display order and nests cards under their column', () => {
    const cols = out.boards[0]!.columns
    expect(cols.map((c) => c.id)).toEqual(['c1', 'c2'])
    expect(cols[0]!.cards.map((c) => c.id)).toEqual(['k1', 'k2'])
    expect(cols[1]!.cards.map((c) => c.id)).toEqual(['k3'])
  })
  it('contains no identity of other people', () => {
    const json = JSON.stringify(out)
    expect(json).not.toMatch(/created_by|user_id|invited_by|board_members/)
  })
})
