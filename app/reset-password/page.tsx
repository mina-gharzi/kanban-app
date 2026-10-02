'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/lib/auth/password'
import { useToastStore } from '@/store/toastStore'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

/**
 * تعیین رمز جدید. به این صفحه فقط از لینک ایمیل می‌رسند: `/auth/callback`
 * کد را با نشست بازیابی عوض می‌کند و به اینجا می‌فرستد. بدون نشست (لینک
 * منقضی، یا باز شده در مرورگر دیگر) فرم نشان داده نمی‌شود.
 */
export default function ResetPasswordPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const { user, isChecking } = useCurrentUser()
  const { updatePassword, isUpdatingPassword } = useAuthMutations()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const message = validateNewPassword(password, confirm)
    if (message) {
      setError(message)
      return
    }
    updatePassword(
      { password },
      {
        onSuccess: () => {
          addToast('رمز عبور تغییر کرد.', 'success')
          router.push('/boards')
        },
      }
    )
  }

  if (isChecking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg" role="status">
        <p className="text-meta text-text-muted">در حال بررسی لینک…</p>
      </div>
    )
  }

  if (!user) {
    return (
      <AuthCard
        title="لینک معتبر نیست"
        subtitle="این لینک منقضی شده، قبلاً استفاده شده، یا در مرورگر دیگری باز شده است."
        footerLink={{ href: '/forgot-password', label: 'دریافت لینک تازه' }}
      >
        <p className="text-meta leading-6 text-text-2">
          لینک بازیابی یک‌بارمصرف است و باید در همان مرورگری باز شود که درخواست را از آن داده‌اید.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="رمز عبور جدید"
      subtitle="رمز تازه‌ای انتخاب کنید. بعد از تغییر، دستگاه‌های دیگر از حسابتان خارج می‌شوند."
      footerLink={{ href: '/boards', label: 'انصراف و رفتن به بوردها' }}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          id="new-password"
          label="رمز عبور جدید"
          required
          error={error}
          hint={`دست‌کم ${MIN_PASSWORD_LENGTH.toLocaleString('fa-IR')} نویسه.`}
        >
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              autoFocus
              dir="ltr"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (error) setError(null)
              }}
            />
          )}
        </Field>

        <Field id="confirm-password" label="تکرار رمز عبور" required>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              autoComplete="new-password"
              dir="ltr"
              value={confirm}
              onChange={(event) => {
                setConfirm(event.target.value)
                if (error) setError(null)
              }}
            />
          )}
        </Field>

        <Button type="submit" fullWidth loading={isUpdatingPassword} className="mt-1">
          {isUpdatingPassword ? 'در حال ذخیره…' : 'ذخیره‌ی رمز جدید'}
        </Button>
      </form>
    </AuthCard>
  )
}
