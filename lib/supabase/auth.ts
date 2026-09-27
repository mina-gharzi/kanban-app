import { supabase } from './client'
import { logError } from '@/lib/errors/logError'
import { normalizeError } from '@/lib/errors/normalizeError'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw normalizeError(error)
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw normalizeError(error)
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw normalizeError(error)
}

let sessionFailureHandled = false

/**
 * آیا کاربر روی صفحات احراز هویت است؟ در این صفحات نشستی وجود ندارد،
 * پس خطای auth به «انقضای نشست» ربط ندارد و باید مثل یک خطای فرم به
 * کاربر گفته شود (مثلاً رمز عبور نادرست در صفحه‌ی ورود).
 */
export function isAuthPage(): boolean {
  if (typeof window === 'undefined') return false
  const { pathname } = window.location
  return pathname === '/login' || pathname === '/register'
}

/**
 * تنها رفتار مشترک برای خطای «نشست منقضی شد»: نشست پاک می‌شود و کاربر
 * به صفحه‌ی ورود می‌رود. هیچ کامپوننتی نباید این رفتار را تکرار کند.
 */
export async function handleSessionExpired(): Promise<void> {
  if (typeof window === 'undefined') return
  if (isAuthPage()) return
  if (sessionFailureHandled) return
  sessionFailureHandled = true

  const { error } = await supabase.auth.signOut()
  if (error) logError(normalizeError(error), 'auth.signOut')

  // بارگذاری مجدد کامل: نشست، Query Cache و state برنامه پاک می‌شوند
  window.location.replace('/login')
}
