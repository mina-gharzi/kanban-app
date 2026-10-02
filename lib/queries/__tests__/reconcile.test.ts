import { describe, expect, it, vi } from 'vitest'
import { countPendingBoardMutations, hasOtherPendingBoardMutation, reconcileBoard } from '../reconcile'
import { queryKeys } from '../keys'

const client = (pending: number) => ({
  isMutating: vi.fn(() => pending),
  invalidateQueries: vi.fn(() => Promise.resolve()),
})

describe('reconcile', () => {
  it('counts mutations by the board scope key', () => {
    const c = client(2)
    expect(countPendingBoardMutations(c, 'b1')).toBe(2)
    expect(c.isMutating).toHaveBeenCalledWith({ mutationKey: queryKeys.boardMutationScope('b1') })
  })
  it('"other pending" means more than the one that is settling right now', () => {
    expect(hasOtherPendingBoardMutation(client(1), 'b')).toBe(false)
    expect(hasOtherPendingBoardMutation(client(2), 'b')).toBe(true)
  })
  it('invalidates only when the settling mutation is the last one', () => {
    const last = client(1)
    reconcileBoard(last, 'b1')
    expect(last.invalidateQueries).toHaveBeenCalledWith({ queryKey: queryKeys.board('b1') })

    const busy = client(3)
    reconcileBoard(busy, 'b1')
    expect(busy.invalidateQueries).not.toHaveBeenCalled()
  })
})
