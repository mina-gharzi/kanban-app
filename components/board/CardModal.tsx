'use client'

import { useEffect, useState } from 'react'
import type { CardMutations } from '@/hooks/useCardMutations'
import type { Card as CardType, CardFieldPatch } from '@/lib/board/types'
import { LABEL_COLORS } from '@/lib/labelColors'

type Props = {
  card: CardType
  cardMutations: CardMutations
  onClose: () => void
}

export default function CardModal({ card, cardMutations, onClose }: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(card.due_date ?? '')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleSave() {
    // یک patch واحد: یک mutation، یک به‌روزرسانی خوش‌بینانه، یک invalidate
    const patch: CardFieldPatch = {}
    const trimmedTitle = title.trim()
    if (trimmedTitle && trimmedTitle !== card.title) patch.title = trimmedTitle
    if (description !== (card.description ?? '')) patch.description = description
    if (dueDate !== (card.due_date ?? '')) patch.due_date = dueDate || null

    if (Object.keys(patch).length > 0) {
      cardMutations.updateCard({ cardId: card.id, patch })
    }
    onClose()
  }

  function handleLabelClick(color: string) {
    cardMutations.updateCard({
      cardId: card.id,
      patch: {
        label_color: card.label_color === color ? null : color,
      },
    })
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-modal-title"
        className="bg-column rounded-xl p-5 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          id="card-modal-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-label="عنوان کارت"
          className="w-full bg-card text-surface font-medium rounded-md p-2 mb-3 outline-none border border-transparent focus:border-accent"
        />

        <label className="text-surface/60 text-xs block mb-1">لیبل</label>
        <div className="flex gap-2 mb-3">
          {LABEL_COLORS.map((label) => (
            <button
              key={label.value}
              title={label.name}
              aria-label={`لیبل ${label.name}`}
              aria-pressed={card.label_color === label.value}
              onClick={() => handleLabelClick(label.value)}
              className="w-6 h-6 rounded-full border-2"
              style={{
                backgroundColor: label.value,
                borderColor:
                  card.label_color === label.value ? 'white' : 'transparent',
              }}
            />
          ))}
        </div>

        <label className="text-surface/60 text-xs block mb-1">تاریخ سررسید</label>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            aria-label="تاریخ سررسید"
            className="flex-1 bg-card text-surface text-sm rounded-md p-2 outline-none border border-transparent focus:border-accent"
          />
          {dueDate && (
            <button
              onClick={() => setDueDate('')}
              aria-label="حذف تاریخ سررسید"
              className="text-accent text-xs px-2"
            >
              حذف تاریخ
            </button>
          )}
        </div>

        <label className="text-surface/60 text-xs block mb-1">توضیحات</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder="توضیحات کارت..."
          aria-label="توضیحات کارت"
          className="w-full bg-card text-surface text-sm rounded-md p-2 outline-none border border-transparent focus:border-accent resize-none"
        />

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => {
              cardMutations.deleteCard(card.id)
              onClose()
            }}
            className="text-accent text-xs hover:opacity-70"
          >
            حذف کارت
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="text-surface/60 text-xs px-3 py-1.5">
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="bg-accent text-surface text-xs rounded-md px-3 py-1.5"
            >
              ذخیره
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
