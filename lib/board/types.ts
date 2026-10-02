export type Board = {
  id: string
  title: string
  created_at: string
  /** مالک بورد (ستون دیتابیس) */
  created_by?: string
  /** نقش کاربر جاری؛ `getBoards` پر می‌کند. فقط برای نمایش رابط است، نه تصمیم امنیتی. */
  role?: import('@/lib/sharing/roles').BoardRole
}

export type Column = {
  id: string
  board_id: string
  title: string
  position: number
}

export type Card = {
  id: string
  column_id: string
  /** denormalized؛ توسط trigger دیتابیس پر می‌شود. کارت‌های optimistic هنوز ندارند. */
  board_id?: string
  title: string
  description: string | null
  position: number
  created_at: string
  label_color: string | null
  due_date: string | null
}

/** فیلدهای کارت که کاربر می‌تواند ویرایش کند. */
export type CardFieldPatch = Partial<
  Pick<Card, 'title' | 'description' | 'label_color' | 'due_date'>
>

/** نمای کامل یک بورد: ستون‌ها + کارت‌های همان ستون‌ها. */
export type BoardData = {
  columns: Column[]
  cards: Card[]
}

export type ColumnPositionUpdate = {
  id: string
  position: number
}

export type CardPositionUpdate = {
  id: string
  column_id: string
  position: number
}
