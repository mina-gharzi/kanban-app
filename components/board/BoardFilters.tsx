'use client'

import { LABEL_COLORS } from '@/lib/labelColors'

type Props = {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeLabelFilter: string | null
  onLabelFilterChange: (color: string | null) => void
}

export default function BoardFilters({
  searchQuery,
  onSearchChange,
  activeLabelFilter,
  onLabelFilterChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-6 pt-4 bg-surface">
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="جستجو در عنوان کارت‌ها..."
        aria-label="جستجو در عنوان کارت‌ها"
        className="bg-column/10 text-column text-sm rounded-md p-2 outline-none border border-column/20 focus:border-accent w-64"
      />

      <div className="flex items-center gap-1.5">
        <span className="text-column/60 text-xs ml-1">لیبل:</span>
        {LABEL_COLORS.map((label) => (
          <button
            key={label.value}
            title={label.name}
            aria-label={`فیلتر بر اساس لیبل ${label.name}`}
            aria-pressed={activeLabelFilter === label.value}
            onClick={() =>
              onLabelFilterChange(activeLabelFilter === label.value ? null : label.value)
            }
            className="w-5 h-5 rounded-full border-2"
            style={{
              backgroundColor: label.value,
              borderColor: activeLabelFilter === label.value ? 'rgb(48,56,65)' : 'transparent',
            }}
          />
        ))}
        {activeLabelFilter && (
          <button
            onClick={() => onLabelFilterChange(null)}
            aria-label="پاک کردن فیلتر لیبل"
            className="text-accent text-xs mr-1 hover:opacity-70"
          >
            پاک‌کردن
          </button>
        )}
      </div>
    </div>
  )
}
