'use client'

import { useBoardPermissions } from './BoardPermissions'
import { useEffect, useRef, useState } from 'react'
import type { Column as ColumnType } from '@/lib/board/types'
import { validateTitle } from '@/lib/board/validation'
import Dropdown, { type MenuItem } from '@/components/ui/Dropdown'
import { IconButton } from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import { DotsIcon, GripIcon, PencilIcon, TrashIcon } from '@/components/ui/icons'

type Props = {
  column: ColumnType
  cardCount: number
  /** ستون هنوز در سرور ثبت نشده: rename/delete معنی ندارد */
  isPending: boolean
  dragHandleProps: Record<string, unknown>
  onRename: (title: string) => void
  onRequestDelete: () => void
}

/**
 * سربرگ ستون.
 *
 * کنش‌های ثانویه (تغییر نام / حذف) داخل منوی `⋯` می‌روند تا سربرگ
 * شلوغ نشود؛ Delete تنها آیتم خطرناک است و رنگ danger دارد. تعداد کارت
 * به‌صورت چیپ کنار عنوان است، نه داخل پرانتز.
 *
 * نام ستون نقش `heading` دارد (DESIGN_PLAN.md §۴.۲) و شمارنده نقش `chip`؛
 * دستگیرهٔ کشیدن اولین عنصر ردیف است تا در RTL کنار لبهٔ نزدیک باشد (§۵.۴).
 */
export default function ColumnHeader({
  column,
  cardCount,
  isPending,
  dragHandleProps,
  onRename,
  onRequestDelete,
}: Props) {
  const { canEdit } = useBoardPermissions()
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(column.title)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) inputRef.current?.focus()
  }, [isEditing])

  function startEditing() {
    setDraftTitle(column.title)
    setError(null)
    setIsEditing(true)
  }

  function save() {
    // خطای اعتبارسنجی کنار فیلد می‌ماند و حالت ویرایش بسته نمی‌شود
    const validationError = validateTitle(draftTitle, 'column')
    if (validationError) {
      setError(validationError.userMessage)
      return
    }
    const trimmed = draftTitle.trim()
    if (trimmed !== column.title) onRename(trimmed)
    setError(null)
    setIsEditing(false)
  }

  function cancel() {
    setError(null)
    setDraftTitle(column.title)
    setIsEditing(false)
  }

  const menuItems: MenuItem[] = [
    {
      label: 'تغییر نام',
      icon: <PencilIcon size={15} />,
      onSelect: startEditing,
    },
    {
      label: 'حذف ستون',
      icon: <TrashIcon size={15} />,
      tone: 'danger',
      onSelect: onRequestDelete,
    },
  ]

  return (
    <div className="flex items-center gap-1.5 px-3 pb-2 pt-3">
      {!isPending && (
        <button
          type="button"
          {...dragHandleProps}
          title="جابه‌جایی ستون"
          aria-label={`جابه‌جایی ستون ${column.title}`}
          className="cursor-grab touch-none rounded-sm p-1.5 text-text-muted transition-colors duration-150 ease-out-soft hover:bg-surface-2 hover:text-text-2 active:cursor-grabbing"
        >
          <GripIcon size={15} />
        </button>
      )}

      {isEditing ? (
        <div className="min-w-0 flex-1">
          <Input
            ref={inputRef}
            size="sm"
            value={draftTitle}
            invalid={error !== null}
            onChange={(event) => {
              setDraftTitle(event.target.value)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') save()
              if (event.key === 'Escape') cancel()
            }}
            onBlur={save}
            aria-label="عنوان ستون"
          />
          {error && (
            <p role="alert" className="mt-1 text-meta text-danger">
              {error}
            </p>
          )}
        </div>
      ) : (
        <h3
          className="min-w-0 flex-1 truncate text-heading font-semibold text-text"
          title={column.title}
        >
          {column.title}
        </h3>
      )}

      <span
        className="shrink-0 rounded-sm bg-surface-2 px-2 py-1 text-chip font-medium tabular text-text-2"
        aria-label={`${cardCount} کارت`}
      >
        {cardCount}
      </span>

      {!isPending && !isEditing && canEdit && (
        <Dropdown
          label={`کنش‌های ستون ${column.title}`}
          items={menuItems}
          trigger={(props) => (
            <IconButton
              {...props}
              label={`کنش‌های ستون ${column.title}`}
              size="sm"
              className="-me-1"
            >
              <DotsIcon size={16} />
            </IconButton>
          )}
        />
      )}
    </div>
  )
}
