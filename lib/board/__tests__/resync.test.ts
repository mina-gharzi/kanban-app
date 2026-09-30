import { describe, expect, it } from 'vitest'
import { HIDDEN_RESYNC_THRESHOLD_MS, createResyncTracker, shouldResyncOnVisible } from '../resync'

describe('createResyncTracker', () => {
  it('ignores the first connection', () => {
    const t = createResyncTracker()
    expect(t.onStatus('connecting')).toBe(false)
    expect(t.onStatus('live')).toBe(false)
  })
  it('asks for a resync when the channel comes back after an error', () => {
    const t = createResyncTracker()
    t.onStatus('live')
    expect(t.onStatus('error')).toBe(false)
    expect(t.onStatus('connecting')).toBe(false)
    expect(t.onStatus('live')).toBe(true)
  })
  it('asks again on every later reconnect', () => {
    const t = createResyncTracker()
    t.onStatus('live')
    t.onStatus('error')
    expect(t.onStatus('live')).toBe(true)
    t.onStatus('error')
    expect(t.onStatus('live')).toBe(true)
  })
  it('an error before the very first live is not a reconnect', () => {
    const t = createResyncTracker()
    t.onStatus('error')
    expect(t.onStatus('live')).toBe(false)
  })
})

describe('shouldResyncOnVisible', () => {
  it('needs a hidden timestamp', () => {
    expect(shouldResyncOnVisible(null, 1_000_000)).toBe(false)
  })
  it('skips short tab switches, resyncs after the threshold', () => {
    expect(shouldResyncOnVisible(0, HIDDEN_RESYNC_THRESHOLD_MS - 1)).toBe(false)
    expect(shouldResyncOnVisible(0, HIDDEN_RESYNC_THRESHOLD_MS)).toBe(true)
  })
})
