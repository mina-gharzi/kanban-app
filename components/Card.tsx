'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Card as CardType } from '@/lib/supabase/queries'

type Props = {
  card: CardType
  onOpen: (card: CardType) => void
}

export default function Card({ card, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card)}
      className="bg-card text-surface rounded-lg mb-2 shadow cursor-grab active:cursor-grabbing overflow-hidden"
    >
      {card.label_color && (
        <div className="h-1.5 w-full" style={{ backgroundColor: card.label_color }} />
      )}
      <div className="p-3">
        <p className="text-sm">{card.title}</p>
        {card.description && (
          <p className="text-xs text-surface/60 mt-1 line-clamp-2">
            {card.description}
          </p>
        )}
      </div>
    </div>
  )
}