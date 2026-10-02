import { describe, expect, it } from 'vitest'
import { LABEL_COLORS, contrastRatio, readableInk, resolveLabelKey } from '../labelColors'

describe('readableInk', () => {
  it('gives every label colour text that passes WCAG AA (4.5:1)', () => {
    for (const label of LABEL_COLORS) {
      const ratio = contrastRatio(label.value, readableInk(label.value))
      expect(ratio, label.key).not.toBeNull()
      expect(ratio!, label.key).toBeGreaterThanOrEqual(4.5)
    }
  })
  it('picks dark text on light colours and light text on dark ones', () => {
    expect(readableInk('rgb(200, 160, 60)')).toBe('#161616') // yellow
    expect(readableInk('rgb(78, 140, 105)')).toBe('#161616') // green
    expect(readableInk('rgb(58, 71, 80)')).toBe('#ffffff') // "blue" (dark slate)
    expect(readableInk('#ffffff')).toBe('#161616')
  })
  it('falls back to dark for unparseable input', () => {
    expect(readableInk('transparent')).toBe('#161616')
  })
})

describe('resolveLabelKey', () => {
  it('accepts keys and legacy rgb values, rejects the rest', () => {
    expect(resolveLabelKey('red')).toBe('red')
    expect(resolveLabelKey('rgb(190, 49, 68)')).toBe('red')
    expect(resolveLabelKey('nope')).toBeNull()
    expect(resolveLabelKey(null)).toBeNull()
  })
})
