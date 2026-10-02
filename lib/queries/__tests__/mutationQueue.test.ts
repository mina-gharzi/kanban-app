import { afterEach, describe, expect, it } from 'vitest'
import {
  hasOptimisticWrite, pendingCreateKey, resetOptimisticTracking, runSerialized, trackOptimisticWrites,
} from '../mutationQueue'

afterEach(() => resetOptimisticTracking())

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('runSerialized', () => {
  it('runs tasks of one scope strictly in order, even when earlier ones are slower', async () => {
    const log: string[] = []
    await Promise.all([
      runSerialized('s', async () => { await sleep(30); log.push('first') }),
      runSerialized('s', async () => { await sleep(1); log.push('second') }),
      runSerialized('s', async () => { log.push('third') }),
    ])
    expect(log).toEqual(['first', 'second', 'third'])
  })
  it('keeps going after a failure, and still reports the failure to its own caller', async () => {
    const log: string[] = []
    const failing = runSerialized('s', async () => { throw new Error('boom') })
    const next = runSerialized('s', async () => { log.push('ran') })
    await expect(failing).rejects.toThrow('boom')
    await next
    expect(log).toEqual(['ran'])
  })
  it('does not block other scopes', async () => {
    const log: string[] = []
    const slow = runSerialized('a', async () => { await sleep(30); log.push('a') })
    await runSerialized('b', async () => { log.push('b') })
    await slow
    expect(log).toEqual(['b', 'a'])
  })
  it('returns the task result', async () => {
    await expect(runSerialized('s', async () => 42)).resolves.toBe(42)
  })
})

describe('trackOptimisticWrites', () => {
  it('reports ids as in flight until released', () => {
    const release = trackOptimisticWrites('board:1', ['a', 'b'])
    expect(hasOptimisticWrite('board:1', ['a'])).toBe(true)
    expect(hasOptimisticWrite('board:1', ['z', 'b'])).toBe(true)
    expect(hasOptimisticWrite('board:1', ['z'])).toBe(false)
    expect(hasOptimisticWrite('board:2', ['a'])).toBe(false)
    release()
    expect(hasOptimisticWrite('board:1', ['a', 'b'])).toBe(false)
  })
  it('counts overlapping writes: an id stays tracked until the LAST one finishes', () => {
    const r1 = trackOptimisticWrites('s', ['a'])
    const r2 = trackOptimisticWrites('s', ['a'])
    r1()
    expect(hasOptimisticWrite('s', ['a'])).toBe(true)
    r2()
    expect(hasOptimisticWrite('s', ['a'])).toBe(false)
  })
  it('release is idempotent (a double call cannot steal another write\'s slot)', () => {
    const r1 = trackOptimisticWrites('s', ['a'])
    const r2 = trackOptimisticWrites('s', ['a'])
    r1(); r1(); r1()
    expect(hasOptimisticWrite('s', ['a'])).toBe(true)
    r2()
    expect(hasOptimisticWrite('s', ['a'])).toBe(false)
  })
})

describe('pendingCreateKey', () => {
  it('is stable per kind and scope', () => {
    expect(pendingCreateKey('card', 'c1')).toBe(pendingCreateKey('card', 'c1'))
    expect(pendingCreateKey('card', 'c1')).not.toBe(pendingCreateKey('column', 'c1'))
  })
})
