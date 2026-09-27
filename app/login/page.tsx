'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthMutations } from '@/hooks/useAuthMutations'

export default function LoginPage() {
  const router = useRouter()
  const { signIn, isSigningIn } = useAuthMutations()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    signIn(
      { email, password },
      { onSuccess: () => router.push('/') }
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-column rounded-xl p-6 w-full max-w-sm"
      >
        <h1 className="text-surface text-lg font-bold mb-5">ورود</h1>

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
          disabled={isSigningIn}
          className="w-full bg-accent text-surface text-sm rounded-md py-2 disabled:opacity-50"
        >
          {isSigningIn ? 'در حال ورود...' : 'ورود'}
        </button>

        <Link
          href="/register"
          className="block text-center text-surface/60 text-xs mt-3 hover:text-surface"
        >
          حساب نداری؟ ثبت‌نام کن
        </Link>
      </form>
    </div>
  )
}