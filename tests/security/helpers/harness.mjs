/**
 * هارنس تست امنیتی — لایه‌ی مشترک.
 *
 * چرا fetch خام به‌جای supabase-js برای REST؟
 *   چون هدف این تست‌ها «شواهد» است. کلاینت انتزاعی بعضی خطاها را
 *   می‌بلعد یا به شکل دیگری پیش می‌برد. با fetch خام، status و کد خطای
 *   واقعی Postgres (مثل 42501 / 23503 / 23502) مستقیم به ما می‌رسد و
 *   قابل ثبت در گزارش است.
 *
 * برای Realtime از supabase-js استفاده می‌شود، چون پروتکل phoenix را
 * خودش مدیریت می‌کند.
 */

import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

// ---------------------------------------------------------------------------
// پیکربندی
// ---------------------------------------------------------------------------

/**
 * نکته‌ی مهم: فایل .env.local در این پروژه CRLF است. اگر فقط روی '\n'
 * split کنیم، '\r' تهِ خط می‌ماند و الگوی /(.*)$/ نمی‌تواند از آن عبور کند
 * (نقطه در regex با line-terminatorها match نمی‌شود). نتیجه این می‌شود که
 * هیچ متغیری خوانده نمی‌شود و اسکریپت به‌اشتباه «Database در دسترس نیست»
 * گزارش می‌کند. این اشتباه در ممیزی اولیه رخ داد.
 */
export function loadEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([\s\S]*)$/)
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return out
}

export function config() {
  const env = loadEnv(new URL('../../../.env.local', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    throw new Error(
      'متغیرهای NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY پیدا نشدند. ' +
        'مسیر مورد انتظار: ../../../.env.local نسبت به این فایل.'
    )
  }
  return { url, anonKey }
}

// ---------------------------------------------------------------------------
// کلاینت REST
// ---------------------------------------------------------------------------

export class Rest {
  /**
   * @param {string} base  مثل https://xxxx.supabase.co
   * @param {string} key   apikey (معمولاً anon یا access_token کاربر)
   * @param {string|null} token اگر داده شود، Authorization: Bearer آن
   */
  constructor(base, key, token = null) {
    this.base = base
    this.key = key
    this.token = token
  }

  /** کلاینت با همه‌ی دسترسی‌های یک session واقعی. */
  asUser(accessToken) {
    return new Rest(this.base, this.key, accessToken)
  }

  async request(method, path, { body, headers = {}, token } = {}) {
    const bearer = token ?? this.token
    const init = { method, headers: { apikey: this.key, ...headers } }
    if (bearer) init.headers.Authorization = 'Bearer ' + bearer
    if (body !== undefined) {
      init.headers['Content-Type'] = 'application/json'
      init.body = JSON.stringify(body)
    }
    const res = await fetch(this.base + path, init)
    const text = await res.text()
    let json
    try {
      json = text === '' ? null : JSON.parse(text)
    } catch {
      json = undefined // پاسخ غیر JSON
    }
    return new Result(res.status, json, text)
  }

  get(p, o) { return this.request('GET', p, o) }
  post(p, o) { return this.request('POST', p, o) }
  patch(p, o) { return this.request('PATCH', p, o) }
  delete(p, o) { return this.request('DELETE', p, o) }

  /**
   * نوشتن و خواندن نتیجه در یک فراخوانی.
   * Prefer: return=representation باعث می‌شود PostgREST سطرهای اثرگذاشته را
   * برگرداند. این برای شمردن «چند سطر واقعاً تغییر کرد» لازم است و دقیقاً
   * همان چیزی است که کلاینت اپلیکیشن برایش assertRowsAffected دارد.
   */
  async write(method, table, { body, match = 'id=eq.{id}', id, preferReturn = true }) {
    const path = `/rest/v1/${table}` + (match && id ? `?${match.replace('{id}', id)}` : '')
    const headers = preferReturn ? { Prefer: 'return=representation' } : {}
    return this.request(method, path, { body, headers })
  }
}

/** پاسخ نرمال‌شده تا assertها ساده و پیام‌ها دقیق باشند. */
export class Result {
  constructor(status, json, text) {
    this.status = status
    this.json = json
    this.text = text
  }
  /** کد خطای Postgres/PostgREST، مثل 42501 یا PGRST202 */
  get code() { return this.json?.code ?? null }
  get message() { return String(this.json?.message ?? this.json?.hint ?? this.text ?? '') }
  get ok() { return this.status >= 200 && this.status < 300 }
  /** تعداد سطرهای برگشتی؛ فقط وقتی پاسخ آرایه باشد معتبر است. */
  get rows() { return Array.isArray(this.json) ? this.json.length : null }
  get rowsData() { return Array.isArray(this.json) ? this.json : null }
  /** آیا خطا از جنس RLS بود؟ */
  get isRlsError() { return /row-level security/i.test(this.message) }
  /** آیا خطا از جنس نبودِ مجوز بود؟ */
  get isPermissionError() { return /^permission denied/i.test(this.message) }
  toString() { return `status=${this.status} code=${this.code ?? '-'} rows=${this.rows ?? '-'} msg=${this.message.slice(0, 120)}` }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const PASSWORD = 'Au-' + randomUUID() + '-x9'

/**
 * یک کاربر واقعی می‌سازد و session فعال می‌گیرد.
 *
 * نکته: در این پروژه mailer_autoconfirm=true است، پس معمولاً بلافاصله
 * session برمی‌گردد. اگر نیاورد (تنظیم پروژه فرق کرده باشد)، با password
 * grant وارد می‌شویم.
 *
 * @returns {Promise<{label:string,email:string,password:string,id:string,accessToken:string,refreshToken:string|null,user:object}>}
 */
export async function createUser(base, anonKey, label) {
  const rest = new Rest(base, anonKey)
  const email = `kanban-audit-${label}-${Date.now()}-${randomUUID().slice(0, 8)}@example.test`
  const password = PASSWORD + label

  const signup = await rest.post('/auth/v1/signup', { body: { email, password } })
  if (!signup.ok) {
    throw new Error(`signup برای ${label} شکست خورد: ${signup}`)
  }

  let accessToken = signup.json?.access_token ?? null
  let refreshToken = signup.json?.refresh_token ?? null
  let id = signup.json?.user?.id ?? signup.json?.id ?? null

  if (!accessToken) {
    // کاربر ساخته شد ولی session نیامد → با رمز وارد می‌شویم
    const login = await rest.post('/auth/v1/token?grant_type=password', { body: { email, password } })
    if (!login.ok) {
      throw new Error(
        `کاربر ${label} ساخته شد ولی login نشد (احتمالاً تأیید ایمیل لازم است): ${login}`
      )
    }
    accessToken = login.json.access_token
    refreshToken = login.json.refresh_token
    id = login.json.user?.id
  }

  if (!id) throw new Error(`برای ${label} هیچ user id ای نیامد`)

  // تأیید می‌کنیم token واقعاً کار می‌کند
  const me = await rest.get('/auth/v1/user', { token: accessToken })
  if (!me.ok) throw new Error(`توکن ${label} معتبر نیست: ${me}`)

  return { label, email, password, id, accessToken, refreshToken, user: me.json }
}

// ---------------------------------------------------------------------------
// ابزارها
// ---------------------------------------------------------------------------

export const uuid = () => randomUUID()

/** نشانه‌گذاری واضح تا ردیف‌های باقی‌مانده قابل شناسایی و پاک‌سازی باشند. */
export const testTag = (label) => `kanban-audit-${label}-${Date.now()}-${randomUUID().slice(0, 6)}`

/**
 * ساخت یک fixture کامل: board + ستون‌ها + کارت‌ها.
 * @returns {Promise<{board:object, columns:object[], cards:object[]}>}
 */
export async function createFixture(rest, userId, { boards = 1, columnsPerBoard = 2, cardsPerColumn = 2 } = {}) {
  const createdBoards = []
  for (let b = 0; b < boards; b++) {
    const board = await rest.write('POST', 'boards', {
      body: { title: testTag('board'), created_by: userId },
    })
    if (!board.ok || board.rows !== 1) {
      throw new Error(`ساخت board شکست خورد: ${board}`)
    }
    const boardRow = board.rowsData[0]

    const createdColumns = []
    for (let c = 0; c < columnsPerBoard; c++) {
      const col = await rest.write('POST', 'columns', {
        body: { board_id: boardRow.id, title: testTag('column'), position: c },
      })
      if (!col.ok || col.rows !== 1) {
        throw new Error(`ساخت column شکست خورد: ${col}`)
      }
      createdColumns.push(col.rowsData[0])
    }

    const createdCards = []
    for (const col of createdColumns) {
      for (let k = 0; k < cardsPerColumn; k++) {
        const card = await rest.write('POST', 'cards', {
          body: { column_id: col.id, title: testTag('card'), position: k },
        })
        if (!card.ok || card.rows !== 1) {
          throw new Error(`ساخت card شکست خورد: ${card}`)
        }
        createdCards.push(card.rowsData[0])
      }
    }
    createdBoards.push({ board: boardRow, columns: createdColumns, cards: createdCards })
  }
  return createdBoards
}

/** حذف fixture با توکن صاحبش (RLS اجازه می‌دهد). */
export async function dropFixture(rest, fixtures) {
  const stats = { boards: 0, columns: 0, cards: 0 }
  for (const f of fixtures) {
    for (const card of f.cards) {
      const r = await rest.write('DELETE', 'cards', { id: card.id })
      if (r.ok) stats.cards += r.rows ?? 0
    }
    for (const col of f.columns) {
      const r = await rest.write('DELETE', 'columns', { id: col.id })
      if (r.ok) stats.columns += r.rows ?? 0
    }
    const r = await rest.write('DELETE', 'boards', { id: f.board.id })
    if (r.ok) stats.boards += r.rows ?? 0
  }
  return stats
}

// ---------------------------------------------------------------------------
// گزارش‌دهی
// ---------------------------------------------------------------------------

/**
 * ثبت نتیجه‌ی یک بررسی. سه حالت مجاز:
 *   PASS  — رفتار دقیقاً همان چیزی بود که انتظار می‌رفت، با شواهد
 *   FAIL  — رفتار خلاف انتظار بود
 *   UNVERIFIED — بدون دسترسی لازم، قابل اثبات نبود
 */
export const STATUS = { PASS: 'PASS', FAIL: 'FAIL', UNVERIFIED: 'UNVERIFIED' }

export class Report {
  constructor(title) {
    this.title = title
    this.entries = []
  }

  record(status, name, expected, actual, note = '') {
    this.entries.push({ status, name, expected, actual, note })
    const icon = status === STATUS.PASS ? '✔' : status === STATUS.FAIL ? '✘' : '?'
    console.log(`  ${icon} [${status}] ${name}`)
    if (status !== STATUS.PASS) {
      console.log(`      انتظار: ${expected}`)
      console.log(`      واقعی : ${actual}`)
    }
    if (note) console.log(`      یادداشت: ${note}`)
    return this
  }

  /**
   * ثبت نتیجه از روی یک boolean.
   *
   * این متد عمداً وجود دارد چون `record(status, ...)` مستعد خطای جای‌گذاری
   * اشتباه است: یک بار آرگومان boolean جای status نشست و همه‌ی نتایج به
   * صورت «[true]» گزارش شدند و شمارش PASS/FAIL بی‌معنا شد.
   */
  check(name, passed, expected, actual, note = '') {
    return this.record(passed ? STATUS.PASS : STATUS.FAIL, name, expected, actual, note)
  }

  get counts() {
    const c = { PASS: 0, FAIL: 0, UNVERIFIED: 0 }
    for (const e of this.entries) c[e.status]++
    return c
  }

  section(name) {
    console.log(`\n${'─'.repeat(70)}\n${name}\n${'─'.repeat(70)}`)
  }

  /** خروج با کد غیرصفر وقتی FAIL وجود دارد — تا CI واقعاً شکست را ببیند. */
  exitOnFailure() {
    const c = this.counts
    process.exitCode = c.FAIL > 0 ? 1 : 0
    return c
  }

  summary() {
    const c = this.counts
    console.log(`\n${'═'.repeat(70)}`)
    console.log(`خلاصه: ${c.PASS} PASS / ${c.FAIL} FAIL / ${c.UNVERIFIED} UNVERIFIED`)
    const failed = this.entries.filter((e) => e.status === STATUS.FAIL)
    if (failed.length) {
      console.log('\nموارد FAIL:')
      for (const f of failed) console.log(`  - ${f.name}\n      ${f.actual}`)
    }
    console.log('═'.repeat(70))
    return c
  }
}
