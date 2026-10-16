// @vitest-environment node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

/**
 * نگهبان بهینه‌سازی بارگذاری تنبل (lazy) در بورد.
 *
 * `CardModal` و `ShareBoardDialog` فقط بعد از کنش کاربر رندر می‌شوند، پس باید
 * از گراف ایستای اولیه‌ی `/board/[boardId]` جدا بمانند. این تست دو تضمین این
 * مرز را می‌شکند:
 *
 * ۱) import ایستای برگشتی (که دوباره کل کد را به chunk اولیه می‌کشد)،
 * ۲) از دست رفتن `export default` که `next/dynamic` برای loader به آن نیاز دارد
 *    (در غیر این صورت ارور فقط هنگام باز شدن دیالوگ در production رخ می‌دهد).
 */
describe('board: user-triggered dialogs stay out of the initial bundle', () => {
  const board = read('components/board/Board.tsx')

  it('does not statically import the dialogs', () => {
    expect(board).not.toMatch(/import\s+CardModal\s+from/)
    expect(board).not.toMatch(/import\s+ShareBoardDialog\s+from/)
  })

  it('loads both dialogs through next/dynamic', () => {
    expect(board).toMatch(/dynamic\(\(\)\s*=>\s*import\(\s*['"]\.\/CardModal['"]\s*\)/)
    expect(board).toMatch(/dynamic\(\(\)\s*=>\s*import\(\s*['"]\.\/ShareBoardDialog['"]\s*\)/)
  })

  it('keeps a default export on both dialogs, as required by next/dynamic', () => {
    expect(read('components/board/CardModal.tsx')).toMatch(/export\s+default/)
    expect(read('components/board/ShareBoardDialog.tsx')).toMatch(/export\s+default/)
  })

  it('leaves the drag-and-drop core eagerly imported for first interaction', () => {
    expect(board).toMatch(/import\s+BoardContent\s+from\s+['"]\.\/BoardContent['"]/)
    expect(read('components/board/BoardContent.tsx')).toMatch(/@dnd-kit\/core/)
  })
})
