'use client'

import { LABEL_COLORS } from '@/lib/labelColors'
import type { BoardFiltersState } from '@/hooks/useBoardFilters'
import Button from '@/components/ui/Button'
import IconButton from '@/components/ui/IconButton'
import Input from '@/components/ui/Input'
import { SearchIcon, XIcon } from '@/components/ui/icons'

type Props = Omit<BoardFiltersState, 'visibleCardIds'>

/**
 * نوار ابزار بورد: جست‌وجو + فیلتر لیبل.
 *
 * جست‌وجو واقعاً فیلتر می‌کند، پس وضعیت «چیزی پیدا نشد» لازم است و
 * `hasActiveFilter` از hook می‌آید تا نمایش آن یک حقیقت واحد باشد
 * (نه محاسبه‌ی دوباره در UI که با hook واگرا می‌شد).
 *
 * ورودی جست‌وجو از همان `Input` مشترک فاز ۲ استفاده می‌کند: شعاع ۸px،
 * ارتفاع ۳۶px، `text-meta`، و حلقهٔ فوکوس یکدست `:focus-visible` به‌جای
 * `ring-primary/25` دستی که در تم تاریک عملاً نامرئی بود.
 *
 * دکمه‌های لیبل «کوچک»اند، پس شعاع `radius-md` و متن `text-meta` دارند
 * (DESIGN_PLAN.md §۷). لیبل فعال دقیقاً همان الگوی `primary-soft` سایدبار
 * و مودال کارت را دارد تا حالت فعال در کل اپ یکسان باشد.
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
        <Input
          size="sm"
          type="search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="جست‌وجو در کارت‌ها"
          aria-label="جست‌وجو در کارت‌ها"
          className="ps-9 pe-8 [&::-webkit-search-cancel-button]:hidden"
        />
        <SearchIcon
          size={16}
          className="pointer-events-none absolute inset-y-0 start-2.5 my-auto text-text-muted"
        />
        {searchQuery && (
          <IconButton
            label="پاک کردن جست‌وجو"
            size="sm"
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 end-1.5 my-auto h-7 w-7"
          >
            <XIcon size={14} />
          </IconButton>
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
                'inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-meta',
                'transition-colors duration-150 ease-out-soft',
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
