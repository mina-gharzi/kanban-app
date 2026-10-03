import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '../labelColors'

/**
 * نگهبان کنتراست توکن‌های طراحی (WCAG AA) در هر دو تم؛ مستقیم از globals.css
 * خوانده می‌شود، پس تغییر یک رنگ که خوانایی را بشکند همین‌جا شکست می‌خورد.
 */
const css = readFileSync(new URL('../../app/globals.css', import.meta.url), 'utf8')

function block(selector: string): string {
  const start = css.search(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{`))
  if (start < 0) throw new Error(`block ${selector} not found`)
  let i = css.indexOf('{', start) + 1
  let depth = 1
  const from = i
  while (depth && i < css.length) {
    if (css[i] === '{') depth++
    if (css[i] === '}') depth--
    i++
  }
  return css.slice(from, i - 1)
}
const parse = (b: string) =>
  Object.fromEntries([...b.matchAll(/--([a-z0-9-]+):\s*(\d+) (\d+) (\d+)/g)].map((m) => [m[1], `rgb(${m[2]}, ${m[3]}, ${m[4]})`]))

const light = parse(block(':root'))
const themes = { light, dark: { ...light, ...parse(block('.dark')) } } as const

// [متن، پس‌زمینه، حداقل]
const TEXT: Array<[string, string]> = [
  ['text', 'bg'], ['text', 'surface'], ['text', 'surface-2'],
  ['text-2', 'bg'], ['text-2', 'surface'], ['text-2', 'surface-2'],
  ['text-muted', 'bg'], ['text-muted', 'surface'], ['text-muted', 'surface-2'],
  ['primary', 'surface'], ['primary', 'bg'], ['primary', 'primary-soft'], ['on-primary', 'primary'],
  ['danger', 'surface'], ['danger', 'danger-soft'], ['success', 'surface'], ['warning', 'surface'],
]
// مرز فیلدها و حلقه‌ی فوکوس: غیرمتن، ≥ 3:1 (WCAG 1.4.11)
const NON_TEXT: Array<[string, string]> = [['border-input', 'surface'], ['ring', 'surface'], ['ring', 'bg']]

for (const [name, t] of Object.entries(themes)) {
  describe(`design tokens (${name})`, () => {
    it.each(TEXT)('text %s on %s ≥ 4.5:1', (fg, bg) => {
      const r = contrastRatio(t[fg]!, t[bg]!)
      expect(r, `${fg} on ${bg}`).not.toBeNull()
      expect(r!, `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5)
    })
    it.each(NON_TEXT)('non-text %s vs %s ≥ 3:1', (fg, bg) => {
      const r = contrastRatio(t[fg]!, t[bg]!)
      expect(r!, `${fg} vs ${bg}`).toBeGreaterThanOrEqual(3)
    })
  })
}
