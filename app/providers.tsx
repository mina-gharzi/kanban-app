'use client'

import { useState, type ReactNode } from 'react'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { logError } from '@/lib/errors/logError'
import { normalizeError } from '@/lib/errors/normalizeError'

/** حداکثر تعداد تلاش مجدد برای خطاهای گذرا. */
const MAX_RETRIES = 2

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        // خطای query اینجا فقط لاگ می‌شود؛ نمایش آن با ویویی است که داده را مصرف می‌کند
        queryCache: new QueryCache({
          onError: (error, query) =>
            logError(normalizeError(error), query.queryHash),
        }),
        defaultOptions: {
          queries: {
            // داده با realtime و mutationها به‌روز می‌شود، پس refetch پرتکرار لازم نیست
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            // retry فقط برای خطای گذرا (شبکه، دیتابیس، محدودیت نرخ).
            // Validation / Auth / Permission با تکرار درخواست بهتر نمی‌شوند.
            retry: (failureCount, error) =>
              failureCount < MAX_RETRIES && normalizeError(error).retryable,
          },
          mutations: {
            // mutation نتیجه‌ی اقدام کاربر است؛ retry می‌تواند رکورد تکراری بسازد
            retry: 0,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
