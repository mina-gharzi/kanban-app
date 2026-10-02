'use client'

import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type {
  RealtimeChannel,
  RealtimePostgresChangesPayload,
  REALTIME_SUBSCRIBE_STATES,
} from '@supabase/supabase-js'
import { AppError } from '@/lib/errors/AppError'
import { ERROR_CODES } from '@/lib/errors/errorCodes'
import { logError } from '@/lib/errors/logError'
import { applyColumnDelete } from '@/lib/board/realtime'
import type { BoardData, Card, Column } from '@/lib/board/types'
import { createResyncTracker, shouldResyncOnVisible } from '@/lib/board/resync'
import { queryKeys } from '@/lib/queries/keys'
import { countPendingBoardMutations } from '@/lib/queries/reconcile'
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
 *
 * پنجم — جبران رویدادهای گم‌شده: Realtime هیچ رویدادی را بازپخش نمی‌کند،
 * پس بعد از هر اتصال مجدد (و بعد از بازگشتِ تبِ طولانی‌مخفی یا رویداد
 * `online`) کش بورد invalidate می‌شود. جزئیات در `lib/board/resync.ts`.
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
    const resyncTracker = createResyncTracker()

    const boardKey = queryKeys.board(boardId)

    /**
     * هم‌گام‌سازی کش با سرور بعد از اتصال مجدد.
     *
     * Realtime رویداد از‌دست‌رفته را بازپخش نمی‌کند؛ هر تغییری که در فاصله‌ی
     * قطعی رخ داده فقط با خواندن دوباره به این تب می‌رسد. اگر mutationی از
     * همین بورد در جریان باشد کاری نمی‌کنیم: refetch وسط کار داده‌ی
     * optimistic را پاک می‌کند و `reconcileBoard` در onSettled همان
     * mutation به‌هرحال داده را تازه می‌کند.
     */
    const resync = (): void => {
      if (disposed) return
      if (countPendingBoardMutations(queryClient, boardId) > 0) return
      void queryClient.invalidateQueries({ queryKey: boardKey })
      // نقش یا عضویت من ممکن است در فاصله‌ی قطعی عوض شده باشد
      void queryClient.invalidateQueries({ queryKey: queryKeys.boards })
    }
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

      // اتصال مجدد (نه اولین اتصال) ⇒ رویدادهای گم‌شده را با refetch جبران کن
      if (resyncTracker.onStatus(next)) resync()

      if (next === 'error') {
        // فقط روی گذار به خطا لاگ می‌شود، نه هر بار که همان خطا تکرار شود؛
        // وگرنه هر تلاش ناموفق پشت‌سرهم کنسول را پر می‌کرد.
        if (changed) {
          // severity = 'warning' و نه 'error': همین شاخه بلافاصله
          // `scheduleRetry()` را صدا می‌زند، پس این وضعیت در طراحیِ فعلی
          // *گذرا* است نه خرابی. گزارشش با شدتِ error هم دروغ می‌گوید و هم
          // alertهای واقعی را زیر این نویز گذرا گم می‌کند.
          logError(
            new AppError({
              code: ERROR_CODES.NETWORK,
              message: `realtime channel "${channelState}"`,
            }),
            'board.realtime',
            { severity: 'warning' }
          )
        }
        scheduleRetry()
      }

      if (changed) setStatus(next)
    }

    const onCardChange = (payload: RealtimePostgresChangesPayload<Card>): void => {
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

    const onColumnChange = (payload: RealtimePostgresChangesPayload<Column>): void => {
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

    /**
     * فیلتر سمت سرور فقط برای INSERT/UPDATE؛ DELETE جداگانه و بدون فیلتر.
     *
     * با REPLICA IDENTITY DEFAULT رکورد DELETE فقط کلید اصلی دارد و فیلتر
     * `board_id=eq.…` روی آن قابل ارزیابی نیست، پس رویدادِ حذف با فیلتر
     * بی‌صدا نمی‌رسد. راه‌حل: INSERT/UPDATE با فیلتر (کاربر با چند بورد دیگر
     * رویداد بوردهای دیگر را نمی‌گیرد) و DELETE بدون فیلتر؛ مالکیتِ DELETE
     * همان‌طور که قبلاً بود از روی کش سنجیده می‌شود (`writeInFlight` و
     * `applyColumnDelete` / filter روی id). `cards.board_id` را trigger
     * دیتابیس نگه می‌دارد (مهاجرت 20260101000002).
     */
    const filter = `board_id=eq.${boardId}`

    const buildChannel = (): RealtimeChannel =>
      supabase
        .channel(`board-${boardId}`)
        .on<Card>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cards', filter }, onCardChange)
        .on<Card>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'cards', filter }, onCardChange)
        .on<Card>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cards' }, onCardChange)
        .on<Column>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'columns', filter }, onColumnChange)
        .on<Column>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'columns', filter }, onColumnChange)
        .on<Column>('postgres_changes', { event: 'DELETE', schema: 'public', table: 'columns' }, onColumnChange)

    const connect = () => {
      if (disposed) return
      channel = buildChannel()
      channel.subscribe((channelState) => {
        updateStatus(toStatus(channelState), channelState)
      })
    }

    connect()

    // لایه‌ی دوم: تب مدتی مخفی بوده (خواب لپ‌تاپ، تب پس‌زمینه) یا شبکه برگشته.
    // سوکت ممکن است هنوز «زنده» به نظر برسد ولی رویدادها را از دست داده باشد.
    let hiddenAt: number | null = null
    const onVisibility = (): void => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now()
        return
      }
      if (shouldResyncOnVisible(hiddenAt, Date.now())) resync()
      hiddenAt = null
    }
    const onOnline = (): void => resync()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      clearRetry()
      lastStatusRef.current = 'connecting'
      if (channel) void supabase.removeChannel(channel)
    }
  }, [boardId, queryClient])

  return status
}