'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { useCooldown } from '@/hooks/useCooldown'
import { MIN_PASSWORD_LENGTH, validateNewPassword } from '@/lib/auth/password'
import { useToastStore } from '@/store/toastStore'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

const RESEND_COOLDOWN_SECONDS = 60

export default function RegisterPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)
  const { signUp, isSigningUp, resendSignup, isResending } = useAuthMutations()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  // ایمیلی که لینک تأیید برایش رفته؛ null یعنی هنوز فرم را نشان بده
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS)

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const message = validateNewPassword(password)
    if (message) {
      setPasswordError(message)
      return
    }

    const cleanEmail = email.trim()
    signUp(
      { email: cleanEmail, password },
      {
        onSuccess: (data) => {
          // «تأیید ایمیل» خاموش: نشست همین‌جا ساخته شده، مستقیم به بوردها
          if (data.session) {
            router.push('/boards')
            return
          }
          // «تأیید ایمیل» روشن: کاربر باید لینک ایمیل را بزند. برای ایمیلِ
          // از‌قبل‌ثبت‌شده هم Supabase همین پاسخ را می‌دهد، پس پیام عمداً
          // یکسان و بدون ادعای «حساب ساخته شد» است.
          setPendingEmail(cleanEmail)
          setPassword('')
          cooldown.start()
        },
      }
    )
  }

  function handleResend() {
    if (!pendingEmail || cooldown.isCooling) return
    resendSignup(
      { email: pendingEmail },
      {
        onSuccess: () => {
          addToast('ایمیل تأیید دوباره ارسال شد.', 'success')
          cooldown.start()
        },
      }
    )
  }

  if (pendingEmail) {
    return (
      <AuthCard
        title="ایمیل خود را بررسی کنید"
        subtitle={`اگر ثبت‌نام انجام شده باشد، لینک تأیید به ${pendingEmail} می‌رسد.`}
        footerLink={{ href: '/login', label: 'بعد از تأیید، وارد شوید' }}
      >
        <div className="flex flex-col gap-4">
          <ul className="list-disc space-y-1.5 ps-5 text-meta leading-6 text-text-2">
            <li>پوشه‌ی هرزنامه (Spam) را هم نگاه کنید.</li>
            <li>لینک را در همین مرورگر و دستگاه باز کنید.</li>
            <li>اگر حسابی با این ایمیل دارید، به‌جای ثبت‌نام وارد شوید یا رمز را بازیابی کنید.</li>
          </ul>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={isResending}
            disabled={cooldown.isCooling || isResending}
            onClick={handleResend}
          >
            {cooldown.isCooling
              ? `ارسال دوباره (${cooldown.remaining.toLocaleString('fa-IR')} ثانیه)`
              : 'ارسال دوباره‌ی ایمیل'}
          </Button>

          <Button type="button" variant="ghost" fullWidth onClick={() => setPendingEmail(null)}>
            ایمیل را اشتباه وارد کردم
          </Button>
        </div>
      </AuthCard>
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
          error={passwordError}
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
              dir="ltr"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value)
                if (passwordError) setPasswordError(null)
              }}
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
