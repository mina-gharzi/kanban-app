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
 * حرکت می‌کند؛ به همین دلیل کمی چرخیده و سایه‌دار است تا از سطح بورد
 * جدا دیده شود.
 */
export default function BoardDragOverlay({ activeCard, activeColumn }: Props) {
  return (
    <DragOverlay dropAnimation={null}>
      {activeCard ? (
        <div className="w-72 rotate-2 cursor-grabbing drop-shadow-lg">
          <CardComponent card={activeCard} />
        </div>
      ) : null}

      {activeColumn ? (
        <div className="w-72 rotate-1 cursor-grabbing rounded-xl border border-primary bg-surface p-3 opacity-95 shadow-lg">
          <h3 className="truncate text-[13px] font-semibold text-text">
            {activeColumn.title}
          </h3>
        </div>
      ) : null}
    </DragOverlay>
  )
}
