'use client'

import { DragOverlay } from '@dnd-kit/core'
import type { Card, Column } from '@/lib/board/types'
import CardComponent from './Card'

type Props = {
  activeCard: Card | null
  activeColumn: Column | null
}

export default function BoardDragOverlay({ activeCard, activeColumn }: Props) {
  return (
    <DragOverlay>
      {activeCard ? <CardComponent card={activeCard} /> : null}
      {activeColumn ? (
        <div className="min-w-65 max-w-65 bg-column rounded-xl p-3 opacity-90">
          <h3 className="text-surface font-medium text-sm">{activeColumn.title}</h3>
        </div>
      ) : null}
    </DragOverlay>
  )
}
