'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

/**
 * کاربر جاری + وضعیت بررسی session.
 *
 * AuthGuard و UserMenu هر دو به این نیاز داشتند؛ یک hook یعنی فقط یک
 * اشتراک روی `onAuthStateChange` و یک منبع حقیقت برای وضعیت session.
 */
export function useCurrentUser(): { user: User | null; isChecking: boolean } {
  const [user, setUser] = useState<User | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsChecking(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsChecking(false)
      }
    )

    return () => listener.subscription.unsubscribe()
  }, [])

  return { user, isChecking }
}
