/**
 * ۰۶ — Realtime: عضویت در publication، رسیدن رویداد، و نشت بین کاربران.
 *
 * چرا این تست با WebSocket خام کار می‌کند و نه با supabase-js:
 *
 *   کلاینت معمولی وقتی join می‌کند، وضعیت `SUBSCRIBED` می‌گیرد حتی وقتی
 *   جدول اصلاً در publication نیست. سرور بعداً یک پیام جدا با event از نوع
 *   `system` می‌فرستد که status آن `error` است و کلاینت آن را به وضعیت
 *   کانال تبدیل نمی‌کند. یعنی UI فکر می‌کند «live» است در حالی که هیچ رویدادی
 *   هرگز نمی‌رسد.
 *
 *   برای همین، تشخیص را از روی همان پیام `system` می‌زنیم و برای اثبات رسیدن
 *   رویداد، یک نوشتن واقعی انجام می‌دهیم و پیام را می‌شماریم.
 */

import { Report, STATUS, config } from './helpers/harness.mjs'
import { withScenario } from './helpers/scenario.mjs'

// مسیر .env.local را دستی حساب نکن؛ config() خودش از جای درست می‌خواند.
const { url: URL_BASE, anonKey: ANON } = config()
const WS_BASE = URL_BASE.replace(/^http/, 'ws') + '/realtime/v1/websocket'

const report = new Report('۰۶ — Realtime')

/**
 * روی یک سوکت، به هر سه جدول join می‌کند و تا مدتی گوش می‌دهد.
 * @returns {Promise<{system:Array, events:Array}>}
 */
function listen(token, { tables, durationMs, onWrite }) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_BASE}?apikey=${ANON}&vsn=1.0.0`)
    const system = []
    const events = []
    let wrote = false
    let finished = false

    const finish = () => {
      if (finished) return
      finished = true
      try { ws.close() } catch { /* بی‌اهمیت */ }
      resolve({ system, events })
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'hb' }))
      for (const table of tables) {
        ws.send(
          JSON.stringify({
            topic: `realtime:public:${table}`,
            event: 'phx_join',
            payload: {
              config: {
                postgres_changes: [{ event: '*', schema: 'public', table }],
                access_token: token,
              },
            },
            ref: 'j-' + table,
          })
        )
      }
      // کمی بعد از join، یک نوشتن واقعی انجام می‌دهیم
      setTimeout(async () => {
        if (wrote) return
        wrote = true
        try { await onWrite() } catch (e) { console.log('    (نوشتن با خطا مواجه شد:', e.message, ')') }
      }, 3000)
      setTimeout(finish, durationMs)
    }

    ws.onmessage = (ev) => {
      let m
      try { m = JSON.parse(ev.data) } catch { return }
      if (m.event === 'system') system.push({ topic: m.topic, ...m.payload })
      if (m.event === 'postgres_changes') events.push({ topic: m.topic, ...m.payload })
    }
    ws.onerror = () => finish()
  })
}

await withScenario(async (ctx) => {
  const { restA, restB, fixture, b } = ctx
  const column = fixture.columns[0]

  // ستون کاربر B، برای سنجش نشت
  const bBoard = await restB.write('POST', 'boards', { body: { title: 'rt-b-board', created_by: b.id } })
  const bBoardId = bBoard.rowsData[0].id
  const bColumn = await restB.write('POST', 'columns', {
    body: { board_id: bBoardId, title: 'rt-b-col', position: 0 },
  })
  const bColumnId = bColumn.rowsData[0].id

  let createdCardId = null

  report.section('۱) آیا جدول‌ها واقعاً عضو publication هستند؟ (سیگنال قطعی)')
  const listenResult = await listen(ctx.a.accessToken, {
    tables: ['boards', 'columns', 'cards'],
    durationMs: 14000,
    onWrite: async () => {
      const r = await restA.write('POST', 'cards', {
        body: { column_id: column.id, title: 'rt-probe-card', position: 1 },
      })
      createdCardId = r.rowsData?.[0]?.id ?? null
      console.log(`    (نوشتن آزمایشی: status=${r.status} id=${createdCardId ?? '—'})`)
    },
  })

  const byTable = {}
  for (const s of listenResult.system) {
    const table = s.topic?.split(':')[2]
    byTable[table] = s
  }

  for (const table of ['boards', 'columns', 'cards']) {
    const s = byTable[table]
    if (!s) {
      report.record(
        STATUS.UNVERIFIED,
        `${table} در publication است`,
        'پیام system بگوید عضو است',
        'هیچ پیام system ای نرسید'
      )
      continue
    }
    if (s.status === 'ok') {
      report.check(`${table} در publication است و اشتراک پذیرفته شد`, true, 'status=ok', s.status)
    } else {
      report.record(
        STATUS.FAIL,
        `${table} در publication نیست ⇒ Realtime روی آن کار نمی‌کند`,
        'status=ok',
        `status=${s.status} — ${String(s.message ?? '').slice(0, 150)}`,
        'این یعنی useBoardRealtime برای این جدول هرگز رویدادی نمی‌گیرد. ' +
          'راه‌حل: اجرای migration مربوط به افزودن جدول‌ها به publication.'
      )
    }
  }

  report.section('۲) آیا رویدادِ یک نوشتن واقعی رسید؟')
  const gotOurEvent = listenResult.events.some(
    (e) => e.new?.id === createdCardId || e.data?.id === createdCardId
  )
  if (listenResult.system.some((s) => s.status !== 'ok')) {
    report.record(
      STATUS.FAIL,
      'رویداد INSERT کارت خودِ کاربر به کلاینت رسید',
      'دست‌کم یک postgres_changes',
      `${listenResult.events.length} رویداد`,
      'قابل انتظار بود، چون جدول‌ها در publication نیستند و پیام system خطا داد.'
    )
  } else {
    report.check(
      'رویداد INSERT کارت خودِ کاربر به کلاینت رسید',
      gotOurEvent,
      'دست‌کم یک postgres_changes',
      `${listenResult.events.length} رویداد: ${JSON.stringify(listenResult.events.map((e) => e.data?.type))}`
    )
  }

  report.section('۳) ★ نشت بین کاربران — آیا B رویداد کارت کاربر A را می‌بیند؟')
  // فقط وقتی معنی دارد که کنترل مثبت بخش ۲ سبز شده باشد. وگرنه «چیزی نرسید»
  // به‌طور خودکار معنای «نشت ندارد» را ندارد.
  const bResult = await listen(b.accessToken, {
    tables: ['boards', 'columns', 'cards'],
    durationMs: 12000,
    onWrite: async () => {
      // A روی داده‌ی خودش می‌نویسد؛ B نباید چیزی بشنود
      await restA.write('PATCH', 'boards', { id: fixture.board.id, body: { title: 'a-title-should-not-leak' } })
      await restA.write('POST', 'cards', { body: { column_id: column.id, title: 'a-card-should-not-leak', position: 2 } })
    },
  })

  const bHeardOurs = bResult.events.filter(
    (e) => e.new?.title === 'a-title-should-not-leak' || e.new?.title === 'a-card-should-not-leak'
  )

  if (gotOurEvent) {
    report.check(
      'B هیچ رویدادی از داده‌ی A دریافت نمی‌کند',
      bHeardOurs.length === 0,
      '۰ رویداد از داده‌ی A',
      `${bHeardOurs.length} رویداد نشتی`
    )
  } else {
    report.record(
      STATUS.UNVERIFIED,
      'B هیچ رویدادی از داده‌ی A دریافت نمی‌کند',
      '۰ رویداد از داده‌ی A',
      `${bResult.events.length} رویداد کل برای B`,
      'وقتی حتی مالک هم رویداد نمی‌گیرد، «نرسیدن به غیرمالک» فقط یک اثبات ' +
        'تهی است و درباره‌ی نشت داده چیزی ثابت نمی‌کند. باید بعد از رفع ' +
        'publication دوباره آزموده شود.'
    )
  }

  report.section('۴) پاک‌سازی')
  await restB.write('DELETE', 'columns', { id: bColumnId })
  await restB.write('DELETE', 'boards', { id: bBoardId })
  console.log('  داده‌ی تستی Realtime حذف شد.')

  report.section('۵) مواردی که از این مسیر قابل اثبات نیستند')
  for (const item of [
    'محتوای دقیق publication از کاتالوگ (نیازمند SQL)',
    'رفتار RLS روی Realtime وقتی publication درست باشد',
  ]) {
    report.record(STATUS.UNVERIFIED, item, 'pg_publication / pg_policies', 'نیازمند SQL')
  }
})

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0
