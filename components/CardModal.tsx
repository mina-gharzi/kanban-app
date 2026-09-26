'use client'

import { useState } from 'react'
import type { Card as CardType } from '@/lib/supabase/queries'
import { LABEL_COLORS } from '@/lib/labelColors'

type Props = {
  card: CardType
  onClose: () => void
  onUpdateTitle: (cardId: string, title: string) => void
  onUpdateDescription: (cardId: string, description: string) => void
  onUpdateLabel: (cardId: string, labelColor: string | null) => void
  onUpdateDueDate: (cardId: string, dueDate: string | null) => void
  onDelete: (cardId: string) => void
}

export default function CardModal({
  card,
  onClose,
  onUpdateTitle,
  onUpdateDescription,
  onUpdateLabel,
  onUpdateDueDate,
  onDelete,
}: Props) {
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description ?? '')
  const [dueDate, setDueDate] = useState(card.due_date ?? '')

  function handleSave() {
    const trimmedTitle = title.trim()
    if (trimmedTitle && trimmedTitle !== card.title) {
      onUpdateTitle(card.id, trimmedTitle)
    }
    if (description !== (card.description ?? '')) {
      onUpdateDescription(card.id, description)
    }
    if (dueDate !== (card.due_date ?? '')) {
      onUpdateDueDate(card.id, dueDate || null)
    }
    onClose()
  }

  function handleLabelClick(color: string) {
    onUpdateLabel(card.id, card.label_color === color ? null : color)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-column rounded-xl p-5 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-card text-surface font-medium rounded-md p-2 mb-3 outline-none border border-transparent focus:border-accent"
        />

        <label className="text-surface/60 text-xs block mb-1">لیبل</label>
        <div className="flex gap-2 mb-3">
          {LABEL_COLORS.map((label) => (
            <button
              key={label.value}
              title={label.name}
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
            className="flex-1 bg-card text-surface text-sm rounded-md p-2 outline-none border border-transparent focus:border-accent"
          />
          {dueDate && (
            <button
              onClick={() => setDueDate('')}
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
          className="w-full bg-card text-surface text-sm rounded-md p-2 outline-none border border-transparent focus:border-accent resize-none"
        />

        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => {
              onDelete(card.id)
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