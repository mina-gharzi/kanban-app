import { supabase } from './client'
import { logError } from '@/lib/errors/logError'
import { normalizeError } from '@/lib/errors/normalizeError'

/**
 * آدرس بازگشت لینک‌های ایمیل (تأیید ثبت‌نام، بازیابی رمز). باید در
 * Supabase ← Authentication ← URL Configuration ← Redirect URLs ثبت شده باشد.
 */
function callbackUrl(next?: string): string {
  const base = `${window.location.origin}/auth/callback`
  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}

/**
 * ثبت‌نام. اگر «تأیید ایمیل» در Supabase روشن باشد `data.session` برابر null
 * است (کاربر باید لینک ایمیل را بزند)؛ اگر خاموش باشد نشست همین‌جا ساخته شده.
 * فراخوان‌کننده بر پایه‌ی `data.session` مسیر را انتخاب می‌کند.
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: callbackUrl() },
  })
  if (error) throw normalizeError(error)
  return data
}

export async function resendSignupEmail(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: callbackUrl() },
  })
  if (error) throw normalizeError(error)
}

/**
 * ارسال لینک بازیابی. Supabase برای ایمیل نامعلوم هم موفق برمی‌گرداند (وجود
 * حساب فاش نمی‌شود)؛ رابط هم باید همیشه یک پیام یکسان نشان بدهد.
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl('/reset-password'),
  })
  if (error) throw normalizeError(error)
}

/** تغییر رمز با نشست بازیابی؛ بعدش نشست‌های دستگاه‌های دیگر باطل می‌شوند */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw normalizeError(error)

  // بهترین تلاش: شکستِ این مرحله نباید تغییر موفق رمز را ناموفق نشان دهد
  const { error: othersError } = await supabase.auth.signOut({ scope: 'others' })
  if (othersError) logError(normalizeError(othersError), 'auth.signOutOthers')
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
  return (
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password'
  )
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
