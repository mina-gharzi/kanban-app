'use client'

import { LABEL_COLORS } from '@/lib/labelColors'
import type { BoardFiltersState } from '@/hooks/useBoardFilters'
import Button from '@/components/ui/Button'
import { SearchIcon, XIcon } from '@/components/ui/icons'

type Props = Omit<BoardFiltersState, 'visibleCardIds'>

/**
 * نوار ابزار بورد: جست‌وجو + فیلتر لیبل.
 *
 * جست‌وجو واقعاً فیلتر می‌کند، پس وضعیت «چیزی پیدا نشد» لازم است و
 * `hasActiveFilter` از hook می‌آید تا نمایش آن یک حقیقت واحد باشد
 * (نه محاسبه‌ی دوباره در UI که با hook واگرا می‌شد).
 */
export default function BoardFilters({
  searchQuery,
  onSearchChange,
  activeLabelFilter,
  onLabelFilterChange,
  hasActiveFilter,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-64">
        <SearchIcon
          size={16}
          className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-text-muted"
        />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جست‌وجو در کارت‌ها"
          aria-label="جست‌وجو در کارت‌ها"
          className={[
            'h-9 w-full rounded-lg border border-border bg-surface ps-9 pe-8 text-[13px]',
            'text-text placeholder:text-text-muted',
            'transition-colors duration-150',
            'hover:border-border-2 focus:border-primary focus:outline-none',
            'focus:ring-2 focus:ring-primary/25',
          ].join(' ')}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            aria-label="پاک کردن جست‌وجو"
            className="absolute inset-y-0 end-2 my-auto flex h-5 w-5 items-center justify-center rounded text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <XIcon size={14} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="فیلتر لیبل">
        {LABEL_COLORS.map((label) => {
          const isActive = activeLabelFilter === label.value
          return (
            <button
              key={label.value}
              type="button"
              onClick={() =>
                onLabelFilterChange(isActive ? null : label.value)
              }
              aria-pressed={isActive}
              className={[
                'inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[12px]',
                'transition-colors duration-150',
                isActive
                  ? 'border-primary bg-primary-soft font-medium text-primary'
                  : 'border-border bg-surface text-text-2 hover:border-border-2 hover:bg-surface-2',
              ].join(' ')}
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: label.value }}
              />
              {label.name}
            </button>
          )
        })}
      </div>

      {hasActiveFilter && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onSearchChange('')
            onLabelFilterChange(null)
          }}
        >
          حذف فیلترها
        </Button>
      )}
    </div>
  )
}
