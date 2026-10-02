'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { reportError } from '@/lib/errors/reportError'
import {
  requestPasswordReset,
  resendSignupEmail,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from '@/lib/supabase/auth'

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
    // بدون «تأیید ایمیل» نشست همین‌جا ساخته می‌شود؛ مثل ورود کش خصوصی پاک شود
    onSuccess: (data) => {
      if (data.session) clearPrivateCache()
    },
    onError: (error) => reportError(error, 'auth.signUp'),
  })

  const resendSignupMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => resendSignupEmail(email),
    onError: (error) => reportError(error, 'auth.resendSignup'),
  })

  const requestResetMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => requestPasswordReset(email),
    onError: (error) => reportError(error, 'auth.requestReset'),
  })

  const updatePasswordMutation = useMutation({
    mutationFn: ({ password }: { password: string }) => updatePassword(password),
    onError: (error) => reportError(error, 'auth.updatePassword'),
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
    resendSignup: resendSignupMutation.mutate,
    isResending: resendSignupMutation.isPending,
    requestReset: requestResetMutation.mutate,
    isRequestingReset: requestResetMutation.isPending,
    updatePassword: updatePasswordMutation.mutate,
    isUpdatingPassword: updatePasswordMutation.isPending,
    signOut: signOutMutation.mutate,
    isSigningOut: signOutMutation.isPending,
  }
}
