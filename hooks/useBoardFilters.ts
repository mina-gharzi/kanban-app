'use client'

import { useMemo, useState } from 'react'
import {
  getVisibleCardIds,
  isFilterActive,
  type BoardFilter,
} from '@/lib/board/filters'
import type { Card } from '@/lib/board/types'

export type BoardFiltersState = {
  searchQuery: string
  onSearchChange: (query: string) => void
  activeLabelFilter: string | null
  onLabelFilterChange: (color: string | null) => void
  hasActiveFilter: boolean
  visibleCardIds: Set<string> | null
}

/**
 * Client/UI state مربوط به جستجو و فیلتر لیبل.
 * کارت‌ها از بیرون (Query Cache) می‌آیند و نتیجه‌ی فیلتر memo می‌شود،
 * نه اینکه به‌عنوان state جدا نگهداری شود.
 */
export function useBoardFilters(cards: readonly Card[]): BoardFiltersState {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeLabelFilter, setActiveLabelFilter] = useState<string | null>(null)

  const filter = useMemo<BoardFilter>(
    () => ({ searchQuery, labelColor: activeLabelFilter }),
    [searchQuery, activeLabelFilter]
  )
  const visibleCardIds = useMemo(
    () => getVisibleCardIds(cards, filter),
    [cards, filter]
  )

  return {
    searchQuery,
    onSearchChange: setSearchQuery,
    activeLabelFilter,
    onLabelFilterChange: setActiveLabelFilter,
    hasActiveFilter: isFilterActive(filter),
    visibleCardIds,
  }
}
