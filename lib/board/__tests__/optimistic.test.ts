import { describe, expect, it } from 'vitest'
import {
  createOptimisticCard, createOptimisticColumn, insertCardAt, insertCardsAt, insertColumnAt,
  isTemporaryId, nextCardPosition, nextColumnPosition, removeCardAt, removeColumnAt,
  replaceTemporaryCard, replaceTemporaryColumn, restoreCardFields, restoreCardPositions,
  restoreColumnPositions, snapshotCardFields, snapshotCardMove, snapshotColumnMove,
} from '../optimistic'
import type { Card, Column } from '../types'

const card = (id: string, column_id = 'c1', position = 0, extra: Partial<Card> = {}): Card => ({
  id, column_id, position, title: id, description: null, created_at: '', label_color: null, due_date: null, ...extra,
})
const column = (id: string, position = 0): Column => ({ id, board_id: 'b', title: id, position })

describe('temporary ids and optimistic entities', () => {
  it('creates recognisable, unique temporary ids', () => {
    const a = createOptimisticCard({ columnId: 'c', title: 't', position: 0 })
    const b = createOptimisticColumn({ boardId: 'b', title: 't', position: 0 })
    expect(isTemporaryId(a.id)).toBe(true)
    expect(isTemporaryId(b.id)).toBe(true)
    expect(isTemporaryId('7f3c9a52-0000-4000-8000-000000000000')).toBe(false)
    expect(a.id).not.toBe(createOptimisticCard({ columnId: 'c', title: 't', position: 0 }).id)
  })
})

describe('next positions', () => {
  it('start at 0 in an empty container', () => {
    expect(nextCardPosition([], 'c1')).toBe(0)
    expect(nextColumnPosition([])).toBe(0)
  })
  it('go after the highest, fractional and negative positions included', () => {
    expect(nextCardPosition([card('a', 'c1', 4), card('b', 'c2', 99)], 'c1')).toBe(5)
    expect(nextCardPosition([card('a', 'c1', 1.5)], 'c1')).toBe(2.5)
    expect(nextCardPosition([card('a', 'c1', -3)], 'c1')).toBeGreaterThan(-3)
    expect(nextColumnPosition([column('x', 2), column('y', 7)])).toBe(8)
  })
})

describe('card move snapshot / restore', () => {
  const cards = [card('a', 'c1', 0), card('b', 'c1', 1), card('c', 'c2', 0)]
  const applied = [{ id: 'a', column_id: 'c2', position: 0.5 }]

  it('snapshots only the touched cards', () => {
    expect(snapshotCardMove(cards, applied).previous).toEqual([{ id: 'a', column_id: 'c1', position: 0 }])
  })
  it('rolls back a card that still holds the optimistic value', () => {
    const snap = snapshotCardMove(cards, applied)
    const moved = cards.map((c) => (c.id === 'a' ? { ...c, column_id: 'c2', position: 0.5 } : c))
    expect(restoreCardPositions(moved, snap).find((c) => c.id === 'a')).toMatchObject({ column_id: 'c1', position: 0 })
  })
  it('does NOT clobber a card that something else moved in the meantime', () => {
    const snap = snapshotCardMove(cards, applied)
    const movedElsewhere = cards.map((c) => (c.id === 'a' ? { ...c, column_id: 'c9', position: 7 } : c))
    expect(restoreCardPositions(movedElsewhere, snap)).toEqual(movedElsewhere)
  })
})

describe('column move snapshot / restore', () => {
  it('restores only while the optimistic position is still in place', () => {
    const cols = [column('a', 0), column('b', 1)]
    const snap = snapshotColumnMove(cols, [{ id: 'a', position: 1.5 }])
    expect(restoreColumnPositions([column('a', 1.5), column('b', 1)], snap)[0]).toMatchObject({ position: 0 })
    const changed = [column('a', 9), column('b', 1)]
    expect(restoreColumnPositions(changed, snap)).toEqual(changed)
  })
})

describe('card field snapshot / restore', () => {
  const before = card('a', 'c1', 0, { title: 'old', description: 'd', label_color: 'red' })
  it('reverts only the fields that still hold the optimistic value', () => {
    const snap = snapshotCardFields(before, { title: 'new', label_color: 'blue' })
    // عنوان هنوز مقدار optimistic است؛ برچسب را کس دیگری عوض کرده (green)
    const current = { ...before, title: 'new', label_color: 'green' }
    expect(restoreCardFields([current], snap)[0]).toMatchObject({ title: 'old', label_color: 'green' })
  })
  it('returns the same reference when nothing needs reverting', () => {
    const snap = snapshotCardFields(before, { title: 'new' })
    const current = { ...before, title: 'edited-by-someone' }
    expect(restoreCardFields([current], snap)[0]).toBe(current)
  })
})

describe('remove / insert round trips', () => {
  it('removeCardAt + insertCardAt restores the original order', () => {
    const cards = [card('a'), card('b'), card('c')]
    const { cards: rest, removed } = removeCardAt(cards, 'b')
    expect(rest.map((c) => c.id)).toEqual(['a', 'c'])
    expect(insertCardAt(rest, removed!).map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
  it('removeCardAt on a missing id is a no-op', () => {
    const cards = [card('a')]
    expect(removeCardAt(cards, 'zzz')).toEqual({ cards, removed: null })
  })
  it('removeColumnAt takes its cards along and everything comes back in place', () => {
    const data = {
      columns: [column('c1', 0), column('c2', 1), column('c3', 2)],
      cards: [card('a', 'c1'), card('b', 'c2'), card('c', 'c1'), card('d', 'c3'), card('e', 'c2')],
    }
    const { data: after, removed } = removeColumnAt(data, 'c2')
    expect(after.columns.map((c) => c.id)).toEqual(['c1', 'c3'])
    expect(after.cards.map((c) => c.id)).toEqual(['a', 'c', 'd'])
    expect(insertColumnAt(after.columns, removed!).map((c) => c.id)).toEqual(['c1', 'c2', 'c3'])
    expect(insertCardsAt(after.cards, removed!.cards).map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('replaceTemporary*', () => {
  const temp = card('optimistic:1', 'c1', 3)
  const server = card('real-1', 'c1', 3)
  it('swaps the temporary card for the server card in place', () => {
    expect(replaceTemporaryCard([card('a'), temp], temp.id, server).map((c) => c.id)).toEqual(['a', 'real-1'])
  })
  it('does not duplicate when Realtime delivered the server copy first', () => {
    const out = replaceTemporaryCard([card('a'), server, temp], temp.id, server)
    expect(out.filter((c) => c.id === 'real-1')).toHaveLength(1)
    expect(out.some((c) => c.id === temp.id)).toBe(false)
  })
  it('appends when the temporary card is already gone', () => {
    expect(replaceTemporaryCard([card('a')], 'optimistic:gone', server).map((c) => c.id)).toEqual(['a', 'real-1'])
  })
  it('behaves the same for columns', () => {
    const t = column('optimistic:9'), s = column('real-9')
    expect(replaceTemporaryColumn([column('x'), t, s], t.id, s).map((c) => c.id)).toEqual(['x', 'real-9'])
  })
})
