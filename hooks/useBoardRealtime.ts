'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { RealtimeChannel, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { logError } from '@/lib/errors/logError'
import { applyColumnDelete } from '@/lib/board/realtime'
import type { BoardData, Card, Column } from '@/lib/board/types'
import { queryKeys } from '@/lib/queries/keys'
import { hasOptimisticWrite, pendingCreateKey } from '@/lib/queries/mutationQueue'
import { supabase } from '@/lib/supabase/client'

/**
 * وضعیت اتصال realtime که UI به آن واکنش نشان می‌دهد.
 *
 * `CLOSED` وضعیت خطا نیست: هم پایانِ عمرِ عمدیِ کانال است (cleanup /
 * `removeChannel`)، هم حالتی که کلاینت خودش تعیین می‌کند. اگر آن را خطا
 * می‌گرفتیم، هر جابه‌جایی بین دو بورد یک «ارتباط با سرور برقرار نشد» به
 * کاربر نشان می‌داد، در حالی که همه‌چیز عادی بود.
 */
export type RealtimeStatus = 'connecting' | 'live' | 'error'

function toStatus(state: REALTIME_SUBSCRIBE_STATES): RealtimeStatus {
  if (state === 'SUBSCRIBED') return 'live'
  // فقط شکست‌های واقعی؛ CLOSED یعنی «بسته شد»، نه «نتوانست وصل شود»
  if (state === 'TIMED_OUT' || state === 'CHANNEL_ERROR') return 'error'
  return 'connecting'
}

/**
 * تأخیرِ تلاش‌های دوباره‌ی اتصال (backoff نمایی، سقف ۱۰ ثانیه).
 *
 * چرا لازم است: روی پلن Free وقتی چند دقیقه هیچ کلاینتی وصل نباشد،
 * سرویس Realtime خودِ «تنانت» را می‌خواباند و با اولین تلاش اتصالِ بعدی
 * دوباره بیدار می‌کند؛ بیدار شدن چند صد میلی‌ثانیه تا چند ثانیه طول
 * می‌کشد. اگر دقیقاً همان لحظه کلاینتی بخواهد وصل شود، یک `CHANNEL_ERROR`
 * می‌گیرد که کاملاً گذرا است. بدون retry، کاربر تا رفرش دستی صفحه با
 * sync زنده‌ی قطع‌شده می‌ماند، چون نه supabase-js و نه این هوک پیش‌تر
 * دوباره subscribe نمی‌کردند.
 *
 * سقف ۱۰ ثانیه عمدی است: منتظر ماندنِ بیشتر از این فقط برای realtime
 * ارزشی ندارد؛ refetch معمولیِ TanStack Query (فوکوس پنجره، mutation بعدی)
 * در آن حد داده را به‌روز نگه می‌دارد.
 */
const RETRY_DELAYS_MS = [1000, 2000, 4000, 8000, 10000]

/**
 * Realtime دومین منبع موازی نیست: هر رویداد فقط Query Cache بورد را
 * به‌روز می‌کند و همان یک منبع، داده‌ی UI را می‌سازد.
 *
 * هماهنگی با Optimistic Update — سه قاعده:
 *
 * ۱) تا وقتی یک نوشتن خوش‌بینانه روی رکوردی در جریان است، رویداد realtime
 *    همان رکورد نادیده گرفته می‌شود. بدون این قاعده، مقدار کهنه‌ی سرور
 *    پیش‌بینی ما را بازنویسی می‌کند و UI به عقب می‌پرد.
 *    همگام‌سازی نهایی را `reconcileBoard` در `onSettled` انجام می‌دهد؛ آن
 *    هم فقط وقتی refetch می‌کند که هیچ mutation دیگری برای این بورد در جریان
 *    نباشد، تا refetch وسط کار تغییر بعدی داده‌ی optimistic را پاک نکند.
 *
 * ۲) INSERT کارتی که همین حالا در حال ساخت است نادیده گرفته می‌شود تا کارت
 *    موقت و کارت واقعی دوبار در کش ننشینند؛ جایگزینی با پاسخ سرور کارِ
 *    خودِ mutation است.
 *
 * ۳) کارت‌های این بورد از طریق ستون‌های همین بورد اعتبارسنجی می‌شوند تا
 *    رویداد بورد دیگر cache این بورد را تغییر ندهد.
 *
 * چهارم — بازیابی اتصال: وقتی کانال به `CHANNEL_ERROR`/`TIMED_OUT` می‌رسد،
 * با backoff نمایی دوباره تلاش می‌شود. کانالِ قبلی resubscribe نمی‌شود؛
 * طبق رفتار فعلی supabase-js یک کانال تازه ساخته می‌شود، چون کانالی که
 * یک‌بار به خطا خورده وضعیتش برای تلاش دوباره قابل‌اعتماد نیست.
 */
export function useBoardRealtime(boardId: string): RealtimeStatus {
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<RealtimeStatus>('connecting')
  const lastStatusRef = useRef<RealtimeStatus>('connecting')

  useEffect(() => {
    if (!boardId) return

    // متغیرهای محلیِ همین effect: بعد از cleanup هر callback دیرهنگامِ
    // کانال یا تایمرِ retry باید بی‌اثر باشد.
    let disposed = false
    let channel: RealtimeChannel | null = null
    let retryTimeout: ReturnType<typeof setTimeout> | null = null
    let attempt = 0

    const boardKey = queryKeys.board(boardId)
    const setBoardData = (updater: (previous: BoardData) => BoardData): void => {
      queryClient.setQueryData<BoardData>(boardKey, (previous) =>
        previous ? updater(previous) : previous
      )
    }
    const writeInFlight = (ids: readonly string[]): boolean =>
      hasOptimisticWrite(boardId, ids)

    const clearRetry = () => {
      if (retryTimeout) {
        clearTimeout(retryTimeout)
        retryTimeout = null
      }
    }

    /**
     * تلاش بعدی را زمان‌بندی می‌کند. عمداً وابسته به تغییرِ `status` نیست
     * (آن گارد فقط برای لاگ/رندر است)، وگرنه دومین `CHANNEL_ERROR` پشت‌سرهم
     * — که وضعیتش با قبلی یکی است — هیچ‌وقت retry تازه‌ای نمی‌ساخت.
     */
    const scheduleRetry = () => {
      if (disposed) return
      clearRetry()
      const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]
      attempt += 1
      retryTimeout = setTimeout(() => {
        if (disposed) return
        if (channel) void supabase.removeChannel(channel)
        connect()
      }, delay)
    }

    const updateStatus = (next: RealtimeStatus, channelState: string) => {
      if (disposed) return
      const changed = next !== lastStatusRef.current
      lastStatusRef.current = next

      // اتصال موفق: شمارنده صفر می‌شود تا شکست بعدی دوباره از کوتاه‌ترین
      // تأخیر شروع کند، نه از سقفِ تلاشِ قبلی.
      if (next === 'live') attempt = 0

      if (next === 'error') {
        // فقط روی گذار به خطا لاگ می‌شود، نه هر بار که همان خطا تکرار شود؛
        // وگرنه هر تلاش ناموفق پشت‌سرهم کنسول را پر می‌کرد.
        if (changed) {
          logError(
            new AppError({
              code: ERROR_CODES.NETWORK,
              message: `realtime channel "${channelState}"`,
            }),
            'board.realtime'
          )
        }
        scheduleRetry()
      }

      if (changed) setStatus(next)
    }

    const buildChannel = (): RealtimeChannel =>
      supabase
        .channel(`board-${boardId}`)
        .on<Card>(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'cards' },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newCard = payload.new
              // قاعده ۲: create در جریان، خودش رکورد را جایگزین می‌کند
              if (writeInFlight([pendingCreateKey('card', newCard.column_id)])) return
              setBoardData((previous) => {
                const belongsToBoard = previous.columns.some(
                  (column) => column.id === newCard.column_id
                )
                const alreadyKnown = previous.cards.some(
                  (card) => card.id === newCard.id
                )
                if (!belongsToBoard || alreadyKnown) return previous
                return { ...previous, cards: [...previous.cards, newCard] }
              })
            }

            if (payload.eventType === 'UPDATE') {
              const updatedCard = payload.new
              // قاعده ۱: نوشتن خوش‌بینانه در جریان، مالک این رکورد است
              if (writeInFlight([updatedCard.id])) return
              setBoardData((previous) => {
                const belongsToBoard = previous.columns.some(
                  (column) => column.id === updatedCard.column_id
                )
                if (!belongsToBoard) return previous
                return {
                  ...previous,
                  cards: previous.cards.map((card) =>
                    card.id === updatedCard.id ? updatedCard : card
                  ),
                }
              })
            }

            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              if (!deletedId) return
              if (writeInFlight([deletedId])) return
              setBoardData((previous) => ({
                ...previous,
                cards: previous.cards.filter((card) => card.id !== deletedId),
              }))
            }
          }
        )
        .on<Column>(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'columns',
            // عمداً فیلتر سمت سرور نداریم.
            //
            // با REPLICA IDENTITY DEFAULT (پیش‌فرض Postgres) رکورد DELETE در WAL
            // فقط کلید اصلی را دارد. پس فیلتر `board_id=eq.…` در سرور قابل ارزیابی
            // نیست و رویداد DELETE بی‌سروصدا حذف می‌شود — یعنی حذف ستون از بوردِ
            // دیگران هرگز به این کلاینت نمی‌رسد. راه‌حل Postgres این است که روی
            // جدول `replica identity full` بگذاریم، ولی این کل بدنه‌ی سطر را در
            // WAL می‌نویسد و هزینه‌ی WAL را بالا می‌برد؛ در عوض سربارش با فیلتر
            // کردن کل رویدادهای بوردهای دیگر روی کلاینت مقایسه می‌شود.
            //
            // مالکیت را به‌جای فیلتر سرور، سمت کلاینت و از روی کش می‌سنجیم؛ برای
            // INSERT/UPDATE که board_id کامل دارند مستقیم، و برای DELETE که فقط
            // id دارد، از طریق «آیا این id در کش من هست؟».
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newColumn = payload.new
              if (newColumn.board_id !== boardId) return
              // قاعده ۲: create ستون در جریان، خودش رکورد را جایگزین می‌کند.
              // کلید روی بورد است چون INSERT شناسه‌ی واقعی ستون را دارد، نه
              // شناسه‌ی موقتی که ما ساخته‌ایم.
              if (writeInFlight([pendingCreateKey('column', boardId)])) return
              setBoardData((previous) => {
                const alreadyKnown = previous.columns.some(
                  (column) => column.id === newColumn.id
                )
                if (alreadyKnown) return previous
                return { ...previous, columns: [...previous.columns, newColumn] }
              })
            }

            if (payload.eventType === 'UPDATE') {
              const updatedColumn = payload.new
              if (updatedColumn.board_id !== boardId) return
              if (writeInFlight([updatedColumn.id])) return
              setBoardData((previous) => {
                const isOurs = previous.columns.some(
                  (column) => column.id === updatedColumn.id
                )
                if (!isOurs) return previous
                return {
                  ...previous,
                  columns: previous.columns.map((column) =>
                    column.id === updatedColumn.id ? updatedColumn : column
                  ),
                }
              })
            }

            if (payload.eventType === 'DELETE') {
              const deletedId = payload.old.id
              if (!deletedId) return
              if (writeInFlight([deletedId])) return
              // منطقِ پاک‌سازی ستون و کارت‌هایش pure است و جدا تست می‌شود؛
              // شامل تستِ idempotent بودن و نادیده‌گرفتن ستونِ بوردِ دیگر.
              setBoardData((previous) => applyColumnDelete(previous, deletedId))
            }
          }
        )

    const connect = () => {
      if (disposed) return
      channel = buildChannel()
      channel.subscribe((channelState) => {
        updateStatus(toStatus(channelState), channelState)
      })
    }

    connect()

    return () => {
      disposed = true
      clearRetry()
      lastStatusRef.current = 'connecting'
      if (channel) void supabase.removeChannel(channel)
    }
  }, [boardId, queryClient])

  return status
}