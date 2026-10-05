import type { BoardData } from '@/lib/board/types'
import type { BoardRole } from '@/lib/sharing/roles'

export type ExportBoardInput = {
  id: string
  title: string
  created_at: string
  role: BoardRole
  data: BoardData
}

/**
 * نسخه‌ی قابل‌حمل داده‌های کاربر (حق دسترسی/قابلیت انتقال).
 * فقط محتوای بوردهایی که کاربر به آن‌ها دسترسی دارد؛ ایمیل یا هویت اعضای دیگر
 * عمداً داخلش نیست (حریم خصوصی دیگران). ترتیب ستون‌ها و کارت‌ها همان ترتیب نمایش است.
 */
export function buildAccountExport(input: { email: string; exportedAt: Date; boards: ExportBoardInput[] }) {
  const byPosition = <T extends { position: number; id: string }>(items: T[]) =>
    [...items].sort((a, b) => a.position - b.position || (a.id < b.id ? -1 : 1))

  return {
    format: 'kanban-export-v1',
    exported_at: input.exportedAt.toISOString(),
    account: { email: input.email },
    boards: input.boards.map((board) => ({
      id: board.id,
      title: board.title,
      created_at: board.created_at,
      my_role: board.role,
      columns: byPosition(board.data.columns).map((column) => ({
        id: column.id,
        title: column.title,
        cards: byPosition(board.data.cards.filter((card) => card.column_id === column.id)).map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description,
          label: card.label_color,
          due_date: card.due_date,
          created_at: card.created_at,
        })),
      })),
    })),
  }
}
