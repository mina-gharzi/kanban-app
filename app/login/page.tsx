'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isSigningIn } = useAuthMutations()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    signIn(
      { email, password },
      { onSuccess: () => router.push('/') }
    )
  }

  return (
    <AuthCard
      title="ورود به حساب"
      subtitle="برای دسترسی به بوردهایتان وارد شوید."
      footerLink={{ href: '/register', label: 'حساب نداری؟ ثبت‌نام کنید' }}
    >
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

        <Button type="submit" fullWidth loading={isSigningIn} className="mt-1">
          {isSigningIn ? 'در حال ورود…' : 'ورود'}
        </Button>
      </form>
    </AuthCard>
  )
}
