import { describe, expect, it } from 'vitest'
import { planCardMove, planColumnMove, positionBetween, sortByPosition } from '../layout'
import type { Card, Column } from '../types'

const col = (id: string, position: number): Column => ({ id, board_id: 'b', title: id, position })
const card = (id: string, column_id: string, position: number): Card => ({
  id, column_id, title: id, description: null, position,
  created_at: '', label_color: null, due_date: null,
})
const columns = [col('c1', 0), col('c2', 1)]

describe('positionBetween', () => {
  it('handles edges and midpoints', () => {
    expect(positionBetween(undefined, undefined)).toBe(0)
    expect(positionBetween(undefined, 3)).toBe(2)
    expect(positionBetween(3, undefined)).toBe(4)
    expect(positionBetween(1, 2)).toBe(1.5)
  })
  it('asks for rebalance when the gap is exhausted or positions tie', () => {
    expect(positionBetween(1, 1)).toBeNull()
    expect(positionBetween(1, 1 + 1e-9)).toBeNull()
  })
})

describe('sortByPosition', () => {
  it('breaks ties by id so every client agrees', () => {
    const a = sortByPosition([card('b', 'c1', 1), card('a', 'c1', 1)])
    expect(a.map((c) => c.id)).toEqual(['a', 'b'])
  })
})

describe('planCardMove', () => {
  const cards = [card('a', 'c1', 0), card('b', 'c1', 1), card('c', 'c1', 2), card('x', 'c2', 0)]

  it('moves across columns with a single update, source column untouched', () => {
    const u = planCardMove(cards, columns, 'a', 'x')
    expect(u).toEqual([{ id: 'a', column_id: 'c2', position: -1 }])
  })
  it('dragging down inside a column lands AFTER the card it is dropped on', () => {
    const u = planCardMove(cards, columns, 'a', 'b')
    expect(u).toEqual([{ id: 'a', column_id: 'c1', position: 1.5 }])
  })
  it('dragging up lands BEFORE the target', () => {
    const u = planCardMove(cards, columns, 'c', 'b')
    expect(u).toEqual([{ id: 'c', column_id: 'c1', position: 0.5 }])
  })
  it('returns null for a no-op drop', () => {
    expect(planCardMove(cards, columns, 'a', 'a')).toBeNull()
    // b روی a: b را «قبل از a» می‌گذارد؛ یک جابه‌جایی واقعی است، نه no-op
    expect(planCardMove(cards, columns, 'b', 'a')).toEqual([
      { id: 'b', column_id: 'c1', position: -1 },
    ])
  })
  it('drops on an empty column', () => {
    const u = planCardMove([card('a', 'c1', 0)], columns, 'a', 'c2')
    expect(u).toEqual([{ id: 'a', column_id: 'c2', position: 0 }])
  })
  it('rebalances the target column when positions tie', () => {
    // b و c هم‌موقعیت‌اند و d را دقیقاً بینشان می‌گذاریم: جا نیست ⇒ rebalance
    const tied = [card('b', 'c1', 1), card('c', 'c1', 1), card('d', 'c1', 5)]
    const u = planCardMove(tied, columns, 'd', 'c')!
    expect(u.map((x) => x.position)).toEqual([0, 1, 2])
    expect(u.map((x) => x.id)).toEqual(['b', 'd', 'c'])
  })
  it('rejects unknown targets', () => {
    expect(planCardMove(cards, columns, 'a', 'nope')).toBeNull()
  })
})

describe('planColumnMove', () => {
  const cols = [col('c1', 0), col('c2', 1), col('c3', 2)]
  it('moves one column with one update', () => {
    expect(planColumnMove(cols, 'c1', 'c3')).toEqual([{ id: 'c1', position: 3 }])
    expect(planColumnMove(cols, 'c3', 'c1')).toEqual([{ id: 'c3', position: -1 }])
    expect(planColumnMove(cols, 'c1', 'c2')).toEqual([{ id: 'c1', position: 1.5 }])
  })
  it('null when dropped on itself', () => {
    expect(planColumnMove(cols, 'c1', 'c1')).toBeNull()
  })
})
