'use client'

import { useCallback, useEffect, useState } from 'react'

/** شمارش معکوس برای دکمه‌هایی مثل «ارسال دوباره‌ی ایمیل» (جلوگیری از اسپم و rate limit) */
export function useCooldown(seconds: number) {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    if (remaining <= 0) return
    const timer = setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [remaining])

  const start = useCallback(() => setRemaining(seconds), [seconds])

  return { remaining, isCooling: remaining > 0, start }
}
