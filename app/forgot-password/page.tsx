'use client'

import { useState } from 'react'
import { useAuthMutations } from '@/hooks/useAuthMutations'
import { useCooldown } from '@/hooks/useCooldown'
import { useToastStore } from '@/store/toastStore'
import AuthCard from '@/components/auth/AuthCard'
import Button from '@/components/ui/Button'
import Field from '@/components/ui/Field'
import Input from '@/components/ui/Input'

const RESEND_COOLDOWN_SECONDS = 60

export default function ForgotPasswordPage() {
  const addToast = useToastStore((s) => s.addToast)
  const { requestReset, isRequestingReset } = useAuthMutations()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const cooldown = useCooldown(RESEND_COOLDOWN_SECONDS)

  function send(target: string, resend: boolean) {
    requestReset(
      { email: target },
      {
        onSuccess: () => {
          setSentTo(target)
          cooldown.start()
          if (resend) addToast('ایمیل بازیابی دوباره ارسال شد.', 'success')
        },
      }
    )
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    send(email.trim(), false)
  }

  if (sentTo) {
    return (
      <AuthCard
        title="ایمیل خود را بررسی کنید"
        // پیام عمداً یکسان است: وجود یا نبودِ حساب فاش نمی‌شود
        subtitle={`اگر حسابی با ${sentTo} وجود داشته باشد، لینک بازیابی رمز عبور برایش ارسال شد.`}
        footerLink={{ href: '/login', label: 'بازگشت به ورود' }}
      >
        <div className="flex flex-col gap-4">
          <ul className="list-disc space-y-1.5 ps-5 text-meta leading-6 text-text-2">
            <li>پوشه‌ی هرزنامه (Spam) را هم نگاه کنید.</li>
            <li>لینک را در همین مرورگر و دستگاه باز کنید؛ مدت محدودی معتبر است.</li>
          </ul>

          <Button
            type="button"
            variant="secondary"
            fullWidth
            loading={isRequestingReset}
            disabled={cooldown.isCooling || isRequestingReset}
            onClick={() => send(sentTo, true)}
          >
            {cooldown.isCooling
              ? `ارسال دوباره (${cooldown.remaining.toLocaleString('fa-IR')} ثانیه)`
              : 'ارسال دوباره‌ی ایمیل'}
          </Button>

          <Button type="button" variant="ghost" fullWidth onClick={() => setSentTo(null)}>
            ایمیل را اشتباه وارد کردم
          </Button>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="بازیابی رمز عبور"
      subtitle="ایمیل حسابتان را بنویسید تا لینک تعیین رمز جدید را بفرستیم."
      footerLink={{ href: '/login', label: 'بازگشت به ورود' }}
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

        <Button type="submit" fullWidth loading={isRequestingReset} className="mt-1">
          {isRequestingReset ? 'در حال ارسال…' : 'ارسال لینک بازیابی'}
        </Button>
      </form>
    </AuthCard>
  )
}
