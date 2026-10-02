import { describe, expect, it } from 'vitest'
import {
  buildCardPatch,
  detectCardEditConflicts,
  readCardFields,
  readDraftFields,
  type CardEditValues,
} from '../conflict'
import type { Card } from '../types'

const v = (over: Partial<CardEditValues> = {}): CardEditValues => ({
  title: 'T', description: null, due_date: null, ...over,
})

describe('readCardFields / readDraftFields', () => {
  const card = { title: 'x', description: '', due_date: '' } as Card
  it('normalises empty strings to null so "" and null never count as a change', () => {
    expect(readCardFields(card)).toEqual({ title: 'x', description: null, due_date: null })
    expect(readCardFields({ ...card, description: undefined as unknown as null })).toMatchObject({ description: null })
  })
  it('trims the draft title only', () => {
    expect(readDraftFields({ title: '  hi  ', description: ' d ', dueDate: '' })).toEqual({
      title: 'hi', description: ' d ', due_date: null,
    })
  })
})

describe('detectCardEditConflicts (three-way)', () => {
  const base = v({ title: 'A', description: 'd0' })

  it('no conflict when the user changed nothing', () => {
    expect(detectCardEditConflicts(base, base, v({ title: 'B' }))).toEqual([])
  })
  it('no conflict when only the server changed', () => {
    expect(detectCardEditConflicts(base, base, v({ title: 'B', description: 'd9' }))).toEqual([])
  })
  it('no conflict when only the user changed', () => {
    expect(detectCardEditConflicts(base, v({ title: 'U', description: 'd0' }), base)).toEqual([])
  })
  it('conflict when both changed the same field differently', () => {
    expect(
      detectCardEditConflicts(base, v({ title: 'U', description: 'd0' }), v({ title: 'S', description: 'd0' })),
    ).toEqual(['title'])
  })
  it('no conflict when both made the identical change', () => {
    expect(
      detectCardEditConflicts(base, v({ title: 'Same', description: 'd0' }), v({ title: 'Same', description: 'd0' })),
    ).toEqual([])
  })
  it('is per-field: edits to different fields merge without a conflict', () => {
    expect(
      detectCardEditConflicts(base, v({ title: 'U', description: 'd0' }), v({ title: 'A', description: 'S' })),
    ).toEqual([])
  })
  it('reports every conflicting field', () => {
    const user = v({ title: 'U', description: 'U', due_date: '2026-01-01' })
    const server = v({ title: 'S', description: 'S', due_date: '2026-02-02' })
    expect(detectCardEditConflicts(v({ title: 'A', description: 'd0' }), user, server)).toEqual([
      'title', 'description', 'due_date',
    ])
  })
})

describe('buildCardPatch', () => {
  it('contains only the fields the user changed, including clearing to null', () => {
    const base = v({ title: 'A', description: 'd', due_date: '2026-01-01' })
    expect(buildCardPatch(base, v({ title: 'A', description: null, due_date: '2026-01-01' }))).toEqual({
      description: null,
    })
    expect(buildCardPatch(base, base)).toEqual({})
  })
})
