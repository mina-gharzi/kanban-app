'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  getVisibleCardIds,
  isFilterActive,
  parseFilterParams,
  writeFilterParams,
  type BoardFilter,
} from '@/lib/board/filters'
import { resolveLabelKey } from '@/lib/labelColors'
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
 * فاصله‌ی نوشتن URL برای تایپ.
 *
 * فیلتر عمداً client-side می‌ماند (به دلایلی که در گزارش آمده)، پس
 * این debounce درخواست شبکه را کم نمی‌کند؛ کارش این است که هر حرف،
 * یک ورودی جدید در تاریخچه‌ی مرورگر نسازد. به همین دلیل نوشتنِ متن
 * جست‌وجو `replace` است و `push` فقط برای تغییر لیبل (کنش گسسته و
 * عمدی) — تا Back/Forward واقعاً بین فیلترهای انتخاب‌شده کار کند.
 */
const URL_SYNC_DEBOUNCE_MS = 300

/**
 * Client/UI state مربوط به جستجو و فیلتر لیبل، همگام با URL.
 *
 * کارت‌ها از بیرون (Query Cache) می‌آیند و نتیجه‌ی فیلتر memo می‌شود،
 * نه اینکه به‌عنوان state جدا نگهداری شود. URL منبع حقیقت است تا لینک
 * قابل اشتراک باشد، refresh فیلتر را از دست ندهد و Back/Forward کار
 * کند.
 */
export function useBoardFilters(cards: readonly Card[]): BoardFiltersState {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const urlFilter = useMemo<BoardFilter>(() => {
    const parsed = parseFilterParams(searchParams)
    const label = parsed.labelColor
    return {
      searchQuery: parsed.searchQuery,
      // لینک دست‌کاری‌شده نباید به فیلتری برسد که هیچ دکمه‌ای در آن
      // `aria-pressed` ندارد و نتیجه‌اش همیشه خالی است.
      labelColor: resolveLabelKey(label),
    }
  }, [searchParams])

  const [searchQuery, setSearchQuery] = useState(urlFilter.searchQuery)
  const [activeLabelFilter, setActiveLabelFilter] = useState<string | null>(
    urlFilter.labelColor
  )

  // مقادیر جاری در ref نگه داشته می‌شوند تا callbackهای debounce هرگز
  // مقدار کهنه نبندند و لازم نباشد به‌خاطر آن‌ها دوباره ساخته شوند.
  // این ref در رندر خوانده نمی‌شود، پس نوشتنش در استریکت‌مود امن است.
  const latestRef = useRef({ searchQuery, activeLabelFilter })
  const searchParamsRef = useRef(searchParams)

  useEffect(() => {
    searchParamsRef.current = searchParams
  }, [searchParams])

  /**
   * Back/Forward یا بازشدن لینک مستقیم: URL از بیرون عوض می‌شود و state
   * باید دنبالش برود.
   *
   * این تنظیم عمداً حین رندر انجام می‌شود، نه در `useEffect`: الگوی رسمی
   * React برای «state وابسته به prop» است، رندر اضافه نمی‌سازد و
   * `setState` در اثر هم ندارد. وقتی خودمان URL را می‌نویسیم، مقادیر
   * از قبل برابرند و React بدون تغییر bail out می‌کند.
   */
  const [syncedUrl, setSyncedUrl] = useState(urlFilter)
  if (
    syncedUrl.searchQuery !== urlFilter.searchQuery ||
    syncedUrl.labelColor !== urlFilter.labelColor
  ) {
    setSyncedUrl(urlFilter)
    setSearchQuery(urlFilter.searchQuery)
    setActiveLabelFilter(urlFilter.labelColor)
  }

  // آینه‌ی state برای ref. این مسیر فقط برای تغییرهای بیرونی (Back/Forward
  // یا بازشدن لینک) لازم است؛ نوشتن همگام در خودِ handlerها انجام شده تا
  // تایپ و سپس تعویض لیبل در یک نفس، متن تازه را در URL بنویسد.
  useEffect(() => {
    latestRef.current = { searchQuery, activeLabelFilter }
  }, [searchQuery, activeLabelFilter])

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const writeUrl = useCallback(
    (next: BoardFilter, mode: 'replace' | 'push') => {
      const params = writeFilterParams(searchParamsRef.current, next)
      const query = params.toString()
      const url = query === '' ? pathname : `${pathname}?${query}`
      if (mode === 'push') router.push(url)
      else router.replace(url, { scroll: false })
    },
    [pathname, router]
  )

  const onSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query)
      // همگام‌سازی فوری (نه در اثر): اگر کاربر بلافاصله بعد لیبل را عوض
      // کند، `onLabelFilterChange` باید تازه‌ترین متن را در URL بنویسد،
      // وگرنه جست‌وجوی در حال تایپ همراه push از دست می‌رود.
      latestRef.current = { searchQuery: query, activeLabelFilter: latestRef.current.activeLabelFilter }
      if (debounceRef.current) clearTimeout(debounceRef.current)

      const apply = () =>
        writeUrl(
          { searchQuery: query, labelColor: latestRef.current.activeLabelFilter },
          'replace'
        )

      // پاک‌کردن جست‌وجو ارزش debounce ندارد و معمولاً همراهِ «حذف
      // فیلترها» است؛ فوری اعمال می‌شود تا URL همان لحظه درست باشد.
      if (query.trim() === '') {
        apply()
        return
      }
      debounceRef.current = setTimeout(apply, URL_SYNC_DEBOUNCE_MS)
    },
    [writeUrl]
  )

  const onLabelFilterChange = useCallback(
    (color: string | null) => {
      setActiveLabelFilter(color)
      latestRef.current = { searchQuery: latestRef.current.searchQuery, activeLabelFilter: color }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      writeUrl(
        { searchQuery: latestRef.current.searchQuery, labelColor: color },
        'push'
      )
    },
    [writeUrl]
  )

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
    onSearchChange,
    activeLabelFilter,
    onLabelFilterChange,
    hasActiveFilter: isFilterActive(filter),
    visibleCardIds,
  }
}
