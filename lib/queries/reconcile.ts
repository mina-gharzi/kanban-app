import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queries/keys'

/**
 * هماهنگی امن بین mutationهای همزمان یک بورد.
 *
 * مسئله: هر mutation در `onSettled` کل بورد را invalidate می‌کرد. اگر کاربر دو تغییر
 * پشت‌سرهم بدهد، refetch مربوط به تغییر اول می‌تواند وسط کار تغییر دوم اجرا شود و
 * نتیجه‌ی سرور (که هنوز شامل تغییر دوم نیست) روی داده‌ی optimistic بی‌نشانِ کاربر بنشیند؛
 * کارت یک لحظه به جای قبلی برمی‌گردد.
 *
 * راه‌حل: refetch فقط زمانی انجام می‌شود که هیچ mutation دیگری برای همان بورد در جریان
 * نباشد؛ یعنی آخرین mutation، مسئول همگام‌سازی است و بقیه فقط اجازه می‌دهند او این کار را
 * بکند. نتیجه: برای N تغییر پشت‌سرهم فقط یک refetch انجام می‌شود و هیچ refetchی وسط
 * mutationهای دیگر اجرا نخواهد شد.
 */

/** تعداد mutationهای در جریانِ همین بورد (شامل خودِ mutationی که در حال settle است). */
export function countPendingBoardMutations(
  queryClient: Pick<QueryClient, 'isMutating'>,
  boardId: string
): number {
  return queryClient.isMutating({
    mutationKey: queryKeys.boardMutationScope(boardId),
  })
}

/**
 * آیا mutation دیگری (غیر از همین‌یکی) هنوز برای این بورد در جریان است؟
 *
 * نکته‌ی ظریف: در TanStack Query v5، متد `onSettled` *قبل* از dispatch شدن وضعیت
 * نهایی صدا زده می‌شود. یعنی خودِ این mutation هم در شمارش `isMutating` هست و وضعیتش
 * هنوز `pending` است. به همین دلیل معیار «1 >» است نه «0 >».
 */
export function hasOtherPendingBoardMutation(
  queryClient: Pick<QueryClient, 'isMutating'>,
  boardId: string
): boolean {
  return countPendingBoardMutations(queryClient, boardId) > 1
}

/**
 * فراخوانی از `onSettled` همه‌ی mutationهای بورد.
 *
 * - اگر mutation دیگری در جریان باشد، کاری نمی‌کند؛ آن mutation (که آخر است) خودش
 *   refetch را انجام می‌دهد.
 * - در غیر این صورت بورد را invalidate می‌کند تا نتیجه‌ی قطعی سرور جای داده‌ی
 *   optimistic را بگیرد.
 *
 * عمداً `await` نمی‌شود: `onSettled` نباید منتظر شبکه بماند و کاربر را معطل کند.
 */
export function reconcileBoard(
  queryClient: Pick<QueryClient, 'isMutating' | 'invalidateQueries'>,
  boardId: string
): void {
  if (hasOtherPendingBoardMutation(queryClient, boardId)) {
    return
  }
  void queryClient.invalidateQueries({ queryKey: queryKeys.board(boardId) })
}
