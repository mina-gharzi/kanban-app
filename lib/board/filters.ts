import type { Card } from './types'

export type BoardFilter = {
  searchQuery: string
  labelColor: string | null
}

/** نام پارامترهای URL؛ کوتاه تا لینک اشتراکی خوانا بماند. */
export const SEARCH_PARAM = 'q'
export const LABEL_PARAM = 'label'

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

/**
 * خواندن فیلتر از query string لینک.
 *
 * لیبل خام برگردانده می‌شود؛ اعتبارسنجی آن با `isKnownLabelColor` است
 * که کنار خودِ لیست لیبل‌ها زندگی می‌کند (این ماژول عمداً هیچ
 * وابستگی زمان‌اجرا ندارد تا pure و قابل تست بماند).
 */
export function parseFilterParams(params: URLSearchParams): BoardFilter {
  return {
    searchQuery: params.get(SEARCH_PARAM) ?? '',
    labelColor: params.get(LABEL_PARAM),
  }
}

/**
 * نوشتن فیلتر روی query string، بدون دست‌زدن به پارامترهای دیگر URL.
 * فیلتر خالی پارامتر نمی‌سازد تا لینک بی‌صدا بماند: `/board/x` نه
 * `/board/x?q=&label=`.
 */
export function writeFilterParams(
  params: URLSearchParams,
  filter: BoardFilter,
): URLSearchParams {
  const next = new URLSearchParams(params)
  const query = filter.searchQuery.trim()
  if (query === '') next.delete(SEARCH_PARAM)
  else next.set(SEARCH_PARAM, filter.searchQuery)
  if (filter.labelColor === null) next.delete(LABEL_PARAM)
  else next.set(LABEL_PARAM, filter.labelColor)
  return next
}
