'use client'

import Skeleton from '@/components/ui/Skeleton'

/**
 * اسکلت صفحه‌ی بورد.
 *
 * ارتفاع ستون‌ها و جای اسکرول افقی باید با بورد واقعی یکی باشد تا بعد از
 * لود، محتوا زیر هدر «نریزد» و کاربر مجبور به اسکرول دوباره شود.
 */
export default function BoardSkeleton() {
  // ارتفاع‌های متفاوت عمدی است: ستون همیشه یک‌قد نیست
  const heights = [3, 5, 2, 4, 3]

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 sm:px-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ms-auto h-8 w-52" />
      </div>
      <div className="border-b border-border px-4 py-2.5 sm:px-6">
        <Skeleton className="h-8 w-full max-w-64" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-3 sm:px-6">
        <div className="flex h-full items-start gap-3">
          {heights.map((height, index) => (
            <div
              key={index}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-border bg-surface-2/60 p-2"
            >
              <Skeleton className="mb-2 h-5 w-24" />
              <div className="flex min-h-16 flex-1 flex-col gap-2">
                {Array.from({ length: height }, (_, cardIndex) => (
                  <Skeleton key={cardIndex} className="h-20 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
