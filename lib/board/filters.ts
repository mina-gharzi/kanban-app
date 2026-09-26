import type { Card } from './types'

export type BoardFilter = {
  searchQuery: string
  labelColor: string | null
}

export function isFilterActive(filter: BoardFilter): boolean {
  return filter.searchQuery.trim() !== '' || filter.labelColor !== null
}

export function matchesCardFilter(card: Card, filter: BoardFilter): boolean {
  const query = filter.searchQuery.trim().toLowerCase()
  const matchesSearch = query === '' || card.title.toLowerCase().includes(query)
  const matchesLabel =
    filter.labelColor === null || card.label_color === filter.labelColor
  return matchesSearch && matchesLabel
}

/**
 * آیدی کارت‌های قابل مشاهده را برمی‌گرداند.
 * وقتی هیچ فیلتری فعال نیست null برمی‌گردد تا لایه UI همه کارت‌ها را نشان دهد.
 */
export function getVisibleCardIds(
  cards: readonly Card[],
  filter: BoardFilter,
): Set<string> | null {
  if (!isFilterActive(filter)) return null
  const visible = new Set<string>()
  for (const card of cards) {
    if (matchesCardFilter(card, filter)) visible.add(card.id)
  }
  return visible
}
