'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { useToastStore } from '@/store/toastStore'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

export default function RegisterPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const { signUp, isSigningUp } = useAuthMutations()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    signUp(
      { email, password },
      {
        onSuccess: () => {
          addToast('ثبت‌نام با موفقیت انجام شد.', 'success')
          router.push('/login')
        },
      }
    )
  }

  return (
    <AuthCard
      title="ساخت حساب"
      subtitle="چند ثانیه طول می‌کشد و بعد می‌توانید اولین بورد را بسازید."
      footerLink={{ href: '/login', label: 'حساب داری؟ وارد شوید' }}
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

        <Field
          id="password"
          label="رمز عبور"
          required
          hint="دست‌کم ۶ نویسه."
        >
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}
        </Field>

        <Button type="submit" fullWidth loading={isSigningUp} className="mt-1">
          {isSigningUp ? 'در حال ثبت‌نام…' : 'ثبت‌نام'}
        </Button>
      </form>
    </AuthCard>
  )
}
