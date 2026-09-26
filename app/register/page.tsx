'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signUp } from '@/lib/supabase/auth'
import { useToastStore } from '@/store/toastStore'

export default function RegisterPage() {
  const router = useRouter()
  const addToast = useToastStore((s) => s.addToast)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    try {
      await signUp(email, password)
      addToast('ثبت‌نام با موفقیت انجام شد.', 'success')
      router.push('/login')
    } catch (err) {
      console.error('خطا در ثبت‌نام:', err)
      addToast(err instanceof Error ? err.message : 'ثبت‌نام ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-column rounded-xl p-6 w-full max-w-sm"
      >
        <h1 className="text-surface text-lg font-bold mb-5">ثبت‌نام</h1>

        <label className="text-surface/60 text-xs block mb-1">ایمیل</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full bg-card text-surface text-sm rounded-md p-2 mb-3 outline-none border border-transparent focus:border-accent"
        />

        <label className="text-surface/60 text-xs block mb-1">رمز عبور</label>
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-card text-surface text-sm rounded-md p-2 mb-4 outline-none border border-transparent focus:border-accent"
        />

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-accent text-surface text-sm rounded-md py-2 disabled:opacity-50"
        >
          {isLoading ? 'در حال ثبت‌نام...' : 'ثبت‌نام'}
        </button>

        <Link
          href="/login"
          className="block text-center text-surface/60 text-xs mt-3 hover:text-surface"
        >
          حساب داری؟ وارد شو
        </Link>
      </form>
    </div>
  )
}