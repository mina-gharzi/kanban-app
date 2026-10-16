import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ERROR_CODES } from '@/lib/errors/errorCodes'

// زنجیره‌ی PostgREST: from('boards').select('id').eq('id', …).maybeSingle()
const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { from, select, eq, maybeSingle }
})

vi.mock('@/lib/supabase/client', () => ({ supabase: { from: mocks.from } }))

import { boardExists } from '../queries'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('boardExists', () => {
  it('returns true when RLS lets the board row through', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'b1' }, error: null })

    await expect(boardExists('b1')).resolves.toBe(true)
    expect(mocks.from).toHaveBeenCalledWith('boards')
    expect(mocks.eq).toHaveBeenCalledWith('id', 'b1')
  })

  it('returns false when the board is missing or hidden by RLS', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(boardExists('b1')).resolves.toBe(false)
  })

  it('throws a normalized error (never NOT_FOUND) when Supabase errors', async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'network request failed', code: '' },
    })

    await expect(boardExists('b1')).rejects.toMatchObject({
      code: ERROR_CODES.NETWORK,
    })
  })
})
