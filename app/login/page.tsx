'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { safeNextPath } from '@/lib/auth/redirects'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isSigningIn } = useAuthMutations()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // /auth/callback با `?error=link` برمی‌گرداند. با useSyncExternalStore خوانده
  // می‌شود (نه setState داخل useEffect): سرور و اولین رندر کلاینت `false` می‌بینند،
  // پس صفحه‌ی ورود استاتیک می‌ماند و hydration ناسازگار نمی‌شود؛ بعد از hydration
  // مقدار واقعی جایگزین می‌شود. رشته‌ی query بدون ناوبری عوض نمی‌شود، پس subscribe لازم نیست.
  const linkError = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get('error') === 'link',
    () => false,
  )

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    signIn(
      { email, password },
      {
        onSuccess: () => {
          // بازگشت به صفحه‌ای که کاربر می‌خواست (proxy ‎?next= می‌گذارد).
          // `window.location` به‌جای `useSearchParams` تا صفحه‌ی ورود مجبور
          // به Suspense و رندر داینامیک نشود؛ این کد فقط بعد از کلیک اجرا می‌شود.
          const next = new URLSearchParams(window.location.search).get('next')
          router.push(safeNextPath(next))
        },
      }
    )
  }

  return (
    <AuthCard
      title="ورود به حساب"
      subtitle="برای دسترسی به بوردهایتان وارد شوید."
      footerLink={{ href: '/register', label: 'حساب نداری؟ ثبت‌نام کنید' }}
    >
      {linkError && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-meta leading-6 text-danger"
        >
          لینک ایمیل معتبر نیست یا منقضی شده. آن را در همان مرورگری باز کنید که
          درخواست را داده‌اید، یا دوباره درخواست دهید.
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field id="email" label="ایمیل" required>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="email"
              required
              autoComplete="email"
              autoFocus
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field id="password" label="رمز عبور" required>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        <div className="-mt-2 text-end">
          <Link
            href="/forgot-password"
            className="rounded text-meta font-medium text-primary underline-offset-4 hover:underline"
          >
            رمز عبور را فراموش کرده‌اید؟
          </Link>
        </div>

        <Button type="submit" fullWidth loading={isSigningIn} className="mt-1">
          {isSigningIn ? 'در حال ورود…' : 'ورود'}
        </Button>
      </form>
    </AuthCard>
  )
}