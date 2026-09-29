'use client'

import Skeleton from '@/components/ui/Skeleton'

/**
 * اسکلت صفحه‌ی بورد.
 *
 * ارتفاع ستون‌ها و جای اسکرول افقی باید با بورد واقعی یکی باشد تا بعد از
 * لود، محتوا زیر هدر «نریزد» و کاربر مجبور به اسکرول دوباره شود. یعنی
 * دقیقاً همان اعدادی که در بورد واقعی استفاده شده‌اند:
 *
 *   عنوان بورد    h-7  (نقش title 20/30)   · چیپ شمارش  h-5
 *   نوار فیلتر    h-9  (Input sm 36px)
 *   ستون          w-72 · rounded-lg · bg-surface-2/60
 *   کارت          rounded-lg · bg-surface · p-3
 *   فاصلهٔ ستون‌ها gap-8 و قد کامل با items-stretch
 *
 * ارتفاع کارت‌های متفاوت عمدی است: ستون همیشه یک‌قد نیست. هر بلوک کارت
 * یکی از دو شکل واقعی کارت را تقلید می‌کند — عنوان تنها (`h-16`) یا
 * عنوان + توضیح + چیپ متادیتا (`h-24`).
 */
const CARD_COUNTS = [3, 5, 2, 4, 3]

export default function BoardSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 sm:px-6">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-5 w-14 rounded-sm" />
        <Skeleton className="ms-auto h-5 w-20" />
      </div>

      <div className="border-b border-border px-4 py-2.5 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full max-w-64" />
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-16 rounded-md" />
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 pb-4 pt-4 sm:px-6">
        <div className="flex min-h-full items-stretch gap-8">
          {CARD_COUNTS.map((count, index) => (
            // مثل Column عمداً `h-full` ندارد: height صریح مانع از
            // `items-stretch` می‌شود و اسکلت دوباره ناهم‌قد می‌شود.
            <div
              key={index}
              className="flex w-72 shrink-0 flex-col rounded-lg border border-border bg-surface-2/60 p-2"
            >
              <div className="flex items-center gap-1.5 px-3 pb-2 pt-3">
                <Skeleton className="h-4 w-4 rounded-sm" />
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-7 rounded-sm" />
              </div>

              <div className="flex min-h-16 flex-1 flex-col gap-2">
                {Array.from({ length: count }, (_, cardIndex) => {
                  const isRich = (cardIndex + index) % 2 === 0
                  return (
                    <div
                      key={cardIndex}
                      className="rounded-lg border border-border bg-surface p-3"
                    >
                      <Skeleton className="h-5 w-3/4" />
                      {isRich ? (
                        <>
                          <Skeleton className="mt-1.5 h-3.5 w-full" />
                          <Skeleton className="mt-1.5 h-3.5 w-2/3" />
                          <Skeleton className="mt-2 h-5 w-24 rounded-sm" />
                        </>
                      ) : null}
                    </div>
                  )
                })}
              </div>

              <div className="mt-2 px-2 py-1.5">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}

          <Skeleton className="h-11 w-72 shrink-0 self-start rounded-lg" />
        </div>
      </div>
    </div>
  )
}
