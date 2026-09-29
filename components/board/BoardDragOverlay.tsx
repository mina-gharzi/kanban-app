'use client'

import { DragOverlay } from '@dnd-kit/core'
import type { Card, Column } from '@/lib/board/types'
import CardComponent from './Card'

type Props = {
  activeCard: Card | null
  activeColumn: Column | null
}

/**
 * پیش‌نمایش شناور هنگام Drag.
 *
 * کارت/ستونِ اصلی هم‌زمان نیمه‌شفاف می‌شود و این نسخه زیر انگشت کاربر
 * حرکت می‌کند. جدا شدن از سطح بورد فقط با سایه‌ی `--elev-drag` انجام
 * می‌شود، نه با چرخش تزئینی: `drop-shadow-lg` و `rotate-*` حذف شدند چون
 * سایه‌ی drag باید همان توکن باشد که در §۸ تعریف شده و هیچ انیمیشن یا
 * چرخشی «برای زیبایی» اضافه نمی‌کنیم (§۹).
 *
 * ستون اینجا همان ظاهر ستون واقعی را دارد (well + شعاع ۱۲px) تا کاربر
 * بداند چه چیزی جابه‌جا می‌شود.
 */
export default function BoardDragOverlay({ activeCard, activeColumn }: Props) {
  return (
    <DragOverlay dropAnimation={null}>
      {activeCard ? (
        <div className="w-72 cursor-grabbing shadow-drag">
          <CardComponent card={activeCard} />
        </div>
      ) : null}

      {activeColumn ? (
        <div className="w-72 cursor-grabbing rounded-lg border border-primary bg-surface-2/60 p-2 opacity-95 shadow-drag">
          <h3 className="truncate px-1 py-1.5 text-heading font-semibold text-text">
            {activeColumn.title}
          </h3>
        </div>
      ) : null}
    </DragOverlay>
  )
}
