'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportError } from '@/lib/errors/reportError'
import { signIn, signOut, signUp } from '@/lib/supabase/auth'

/**
 * عملیات احراز هویت به‌عنوان mutation تا از try/catch در صفحه‌ها
 * جلوگیری شود و گزارش خطا از مسیر مشترک reportError انجام شود.
 */
export function useAuthMutations() {
  const queryClient = useQueryClient()

  // با تعویض کاربر نباید داده‌ی کاربر قبلی در کش بماند
  const clearPrivateCache = () => queryClient.removeQueries()

  const signInMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signIn(email, password),
    onSuccess: clearPrivateCache,
    onError: (error) => reportError(error, 'auth.signIn'),
  })

  const signUpMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      signUp(email, password),
    onError: (error) => reportError(error, 'auth.signUp'),
  })

  const signOutMutation = useMutation({
    mutationFn: signOut,
    onSuccess: clearPrivateCache,
    onError: (error) => reportError(error, 'auth.signOut'),
  })

  return {
    signIn: signInMutation.mutate,
    isSigningIn: signInMutation.isPending,
    signUp: signUpMutation.mutate,
    isSigningUp: signUpMutation.isPending,
    signOut: signOutMutation.mutate,
    isSigningOut: signOutMutation.isPending,
  }
}
