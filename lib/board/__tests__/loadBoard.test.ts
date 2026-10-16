import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import type { BoardData } from '@/lib/board/types'

const mocks = vi.hoisted(() => ({
  getBoardData: vi.fn(),
  boardExists: vi.fn(),
}))

vi.mock('@/lib/supabase/queries', () => ({
  getBoardData: mocks.getBoardData,
  boardExists: mocks.boardExists,
}))

import { loadBoardData } from '../loadBoard'

const EMPTY: BoardData = { columns: [], cards: [] }
const WITH_COLUMN: BoardData = {
  columns: [{ id: 'c1', board_id: 'b1', title: 'کار', position: 0 }],
  cards: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loadBoardData', () => {
  it('skips the existence check when the board has columns', async () => {
    mocks.getBoardData.mockResolvedValue(WITH_COLUMN)

    await expect(loadBoardData('b1')).resolves.toEqual(WITH_COLUMN)
    expect(mocks.boardExists).not.toHaveBeenCalled()
  })

  it('keeps a genuinely empty but accessible board as empty', async () => {
    mocks.getBoardData.mockResolvedValue(EMPTY)
    mocks.boardExists.mockResolvedValue(true)

    await expect(loadBoardData('b1')).resolves.toEqual(EMPTY)
    expect(mocks.boardExists).toHaveBeenCalledWith('b1')
  })

  it('throws NOT_FOUND for a missing or inaccessible board', async () => {
    mocks.getBoardData.mockResolvedValue(EMPTY)
    mocks.boardExists.mockResolvedValue(false)

    await expect(loadBoardData('b1')).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
      retryable: false,
    })
  })

  it('propagates a data-fetch error instead of reporting not-found', async () => {
    const error = new Error('boom')
    mocks.getBoardData.mockRejectedValue(error)

    await expect(loadBoardData('b1')).rejects.toBe(error)
    expect(mocks.boardExists).not.toHaveBeenCalled()
  })

  it('propagates an existence-check error instead of reporting not-found', async () => {
    mocks.getBoardData.mockResolvedValue(EMPTY)
    const error = new Error('offline')
    mocks.boardExists.mockRejectedValue(error)

    await expect(loadBoardData('b1')).rejects.toBe(error)
  })
})
