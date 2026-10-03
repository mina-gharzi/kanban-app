import { randomUUID } from 'node:crypto'
import { supabaseConfig } from './env'

/**
 * ساخت کاربر واقعی در Supabase Auth برای تست‌های E2E.
 *
 * چرا از REST و نه از UI:
 *   صفحه‌ی ثبت‌نام (`/register`) خودش یک جریان قابل‌تست است، اما برای هر تست
 *   E2E که به دو نقش نیاز دارد، ساختن کاربر از طریق UI کند و شکننده است. ساخت
 *   کاربر از setup انجام می‌شود؛ چیزی که تست‌ها واقعاً می‌سنجند (ورود، مجوز،
 *   Drag & Drop، realtime) همچنان از UI و با نشست واقعی انجام می‌شود.
 *
 * پسورد ثابت است تا بتوان از طریق فرم واقعی `/login` وارد شد. ایمیل‌ها یکتا
 * هستند تا اجرای موازی/مجدد تست‌ها با هم برخورد نکند.
 *
 * این متد با `anon` key کار می‌کند و همان چیزی را می‌سازد که یک بازدیدکننده‌ی
 * عادی می‌تواند بسازد — یعنی تست‌ها روی داده‌ای واقعی و بدون دور زدن مجوز اجرا
 * می‌شوند.
 */
export const TEST_PASSWORD = 'E2E-Kanban-Pass-1!'

export type TestUser = {
  label: string
  email: string
  password: string
  id: string
  accessToken: string
}

export async function createTestUser(label: string): Promise<TestUser> {
  const { url, anonKey } = supabaseConfig()
  const email = `kanban-e2e-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`

  const res = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  })
  const json = await res.json().catch(() => null)

  if (!res.ok || !json?.access_token) {
    throw new Error(`ساخت کاربر تست ${label} ناموفق بود: HTTP ${res.status} ${JSON.stringify(json)}`)
  }

  return {
    label,
    email,
    password: TEST_PASSWORD,
    id: json.user?.id ?? json.id,
    accessToken: json.access_token,
  }
}

/** یک REST ساده با توکن واقعی کاربر — فقط برای setup/پاک‌سازی و assertهای مستقل. */
export function userRest(user: TestUser) {
  const { url, anonKey } = supabaseConfig()
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${user.accessToken}`,
    'Content-Type': 'application/json',
  }
  return {
    async get(path: string) {
      const res = await fetch(`${url}/rest/v1/${path}`, { headers })
      const body = await res.json().catch(() => null)
      return { status: res.status, rows: Array.isArray(body) ? body : null }
    },
    async rpc(fn: string, body: unknown) {
      const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => null)
      return { status: res.status, body: payload }
    },
    /** نوشتن مستقیم با توکن کاربر — برای ساختن داده‌ای که از UI ساخته نمی‌شود */
    async post(table: string, body: unknown) {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify(body),
      })
      const payload = await res.json().catch(() => null)
      return { status: res.status, rows: Array.isArray(payload) ? payload.length : null }
    },
  }
}

/**
 * پاک‌سازی داده‌ی یک کاربر. با توکن خودِ کاربر انجام می‌شود، پس اگر RLS خراب
 * باشد این_cleanup هم لو می‌دهد (و تست بعدی به‌جای پاسخ تمیز، داده‌ی کاربر قبلی
 * را می‌بیند و شکست می‌خورد).
 */
export async function deleteAllBoards(user: TestUser): Promise<void> {
  const { url, anonKey } = supabaseConfig()
  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${user.accessToken}`,
    'Content-Type': 'application/json',
  }
  const list = await fetch(`${url}/rest/v1/boards?select=id`, { headers })
  const boards = (await list.json().catch(() => [])) as { id: string }[]
  for (const b of boards ?? []) {
    await fetch(`${url}/rest/v1/boards?id=eq.${b.id}`, { method: 'DELETE', headers })
  }
}