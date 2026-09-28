/**
 * ۰۳ — Foreign Key و ON DELETE CASCADE، همراه با آشکارسازی orphan.
 *
 * مشکل ظاهری این تست:
 *   policy مربوط به cards از طریق columns/boards می‌گذرد. اگر یک column حذف
 *   شود ولی کارت‌هایش به‌جای cascade باقی بمانند (orphan)، آن کارت‌ها از
 *   دید کاربر «نامرئی» می‌شوند. پس شمارش ساده هیچ فرقی بین «درست حذف شده»
 *   و «بی‌صدا باقی مانده» نمی‌بیند. آشکارسازی orphan از این مسیر کور است.
 *
 * راه‌حل — «آزمون زنده‌سازی» (resurrection probe):
 *   1. یک column می‌سازیم و یک کارت داخلش
 *   2. column را حذف می‌کنیم
 *   3. همان column را *با همان UUID* دوباره INSERT می‌کنیم
 *   4. اگر کارت‌ها قبلاً cascade نشده باشند، حالا دوباره به policy وصل
 *      می‌شوند و برای کاربر دیده می‌شوند. اگر cascade شده باشند، برای همیشه
 *      ناپدید شده‌اند و چیزی برنمی‌گردد.
 *
 *   پس تفاوت بین «cascade کار می‌کند» و «FK وجود ندارد» از داخل خود RLS
 *   قابل تشخیص می‌شود، بدون نیاز به service_role یا SQL مستقیم.
 */

import { Report, STATUS } from './helpers/harness.mjs'
import { withScenario, gated } from './helpers/scenario.mjs'

const report = new Report('۰۳ — Foreign Key و ON DELETE CASCADE')

await withScenario(async (ctx) => {
  const { restA, fixture } = ctx
  const board = fixture.board
  const column = fixture.columns[0]
  // fixture.columns[1] و cards[0..1] در این فایل لازم نیستند؛ عمداً استفاده
  // نمی‌شوند تا شمارش‌های این تست فقط به داده‌ی ساخته‌شده‌ی خودش مربوط باشد.

  report.section('۱) جهت DELETE روی column — آیا اصلاً اجازه‌ی حذف داده می‌شود؟')
  // اگر FK به‌صورت RESTRICT/NO ACTION باشد، این DELETE با 23503 رد می‌شود.
  // اگر CASCADE باشد یا اصلاً FK نباشد، موفق می‌شود. تفکیک نهایی در بخش ۲.
  const delCol = await restA.write('DELETE', 'columns', { id: column.id })
  const deleteSucceeded = delCol.ok && delCol.rows === 1

  report.record(
    deleteSucceeded
      ? STATUS.PASS
      : delCol.code === '23503'
        ? STATUS.FAIL
        : STATUS.UNVERIFIED,
    'حذف column دارای کارت رفتار قابل انتظاری دارد',
    deleteSucceeded
      ? 'حذف موفق ⇒ FK دست‌کم restrictive نیست'
      : 'خطای FK ⇒ ON DELETE CASCADE تنظیم نشده',
    delCol.toString(),
    delCol.code === '23503'
      ? 'اگر اپ کارت‌های ستون را باید پاک کند ولی DB خطا بدهد، حذف ستون در UI خراب می‌شود'
      : ''
  )

  report.section('۲) آشکارسازی orphan با «زنده‌سازی» column (بدون service_role)')
  if (deleteSucceeded) {
    // همان UUID را دوباره می‌سازیم تا orphanها دوباره قابل دیدن شوند
    const resurrect = await restA.write('POST', 'columns', {
      body: { id: column.id, board_id: board.id, title: 'resurrected', position: 0 },
    })
    gated(
      report,
      ctx,
      resurrect.ok && resurrect.rows === 1,
      'می‌توان column را با همان UUID دوباره ساخت (پیش‌نیاز آزمون)',
      'status=2xx rows=1',
      resurrect.toString(),
      'بدون این قابلیت، آشکارسازی orphan ممکن نیست'
    )

    if (resurrect.ok && resurrect.rows === 1) {
      const reappeared = await restA.get(
        `/rest/v1/cards?column_id=eq.${column.id}&select=id,title`
      )
      const orphans = reappeared.rowsData ?? []
      report.record(
        orphans.length === 0 ? STATUS.PASS : STATUS.FAIL,
        'کارت‌های column حذف‌شده واقعاً ناپدید شده‌اند (CASCADE درست کار می‌کند)',
        'پس از زنده‌سازی column هیچ کارتی برنگردد ⇒ cascade واقعاً حذف کرده',
        `${orphans.length} کارت برگشت: ${JSON.stringify(orphans.map((o) => o.title))}`,
        orphans.length > 0
          ? 'ORPHAN: این کارت‌ها بعد از حذف parent باقی مانده بودند ⇒ FK با ON DELETE CASCADE وجود ندارد'
          : 'شواهد قطعی حذف فیزیکی فرزندان'
      )
    }
  }

  report.section('۳) جهت DELETE روی board — ستون‌ها و کارت‌ها چه می‌شوند؟')
  // قبل از حذف، تعداد واقعی فرزندان را می‌شماریم تا با آزمون زنده‌سازی
  // مقایسه کنیم.
  const colsBefore = await restA.get(`/rest/v1/columns?board_id=eq.${board.id}&select=id&limit=100`)
  const cardsBefore = await restA.get(`/rest/v1/cards?select=id&limit=100`)
  const expectedCols = colsBefore.rows
  const expectedCards = cardsBefore.rows
  console.log(`  (پیش از حذف: ${expectedCols} column و ${expectedCards} card در دید A)`)

  // ابتدا fixture اصلی پاک می‌شود تا فقط این board باقی بماند و شمارش تمیز باشد
  for (const k of fixture.cards) await restA.write('DELETE', 'cards', { id: k.id })
  for (const c of fixture.columns) await restA.write('DELETE', 'columns', { id: c.id })

  // یک زنجیره‌ی کنترل‌شده می‌سازیم: board با ۲ ستون و ۲ کارت
  const probeBoard = await restA.write('POST', 'boards', {
    body: { title: 'cascade-probe-board', created_by: ctx.a.id },
  })
  const probeBoardId = probeBoard.rowsData[0].id
  const c1 = await restA.write('POST', 'columns', {
    body: { board_id: probeBoardId, title: 'p1', position: 0 },
  })
  const c2 = await restA.write('POST', 'columns', {
    body: { board_id: probeBoardId, title: 'p2', position: 1 },
  })
  const k1 = await restA.write('POST', 'cards', {
    body: { column_id: c1.rowsData[0].id, title: 'k-in-p1', position: 0 },
  })
  const k2 = await restA.write('POST', 'cards', {
    body: { column_id: c2.rowsData[0].id, title: 'k-in-p2', position: 0 },
  })
  const k3 = await restA.write('POST', 'cards', {
    body: { column_id: c1.rowsData[0].id, title: 'k2-in-p1', position: 1 },
  })
  console.log(
    `  (زنجیره ساخته شد: ۲ column، ${[k1, k2, k3].filter((r) => r.rows === 1).length} کارت)`
  )

  const delBoard = await restA.write('DELETE', 'boards', { id: probeBoardId })
  report.record(
    delBoard.ok && delBoard.rows === 1 ? STATUS.PASS : STATUS.FAIL,
    'حذف board دارای ستون و کارت موفق است',
    'status=2xx rows=1',
    delBoard.toString(),
    delBoard.code === '23503'
      ? 'ON DELETE CASCADE روی board وجود ندارد ⇒ حذف board در UI خطا می‌دهد'
      : ''
  )

  if (delBoard.ok) {
    const resurrectBoard = await restA.write('POST', 'boards', {
      body: { id: probeBoardId, title: 'resurrected-board', created_by: ctx.a.id },
    })
    gated(
      report,
      ctx,
      resurrectBoard.ok && resurrectBoard.rows === 1,
      'می‌توان board را با همان UUID دوباره ساخت',
      'status=2xx rows=1',
      resurrectBoard.toString()
    )

    if (resurrectBoard.ok) {
      const colsBack = await restA.get(`/rest/v1/columns?board_id=eq.${probeBoardId}&select=id,title&limit=100`)
      const cardsBack = await restA.get(`/rest/v1/cards?select=id,title&limit=100`)

      report.record(
        (colsBack.rows ?? 0) === 0 ? STATUS.PASS : STATUS.FAIL,
        'ستون‌های board حذف‌شده واقعاً ناپدید شده‌اند (CASCADE board→column)',
        'پس از زنده‌سازی board هیچ column برنگردد',
        `${colsBack.rows} ستون برگشت: ${JSON.stringify((colsBack.rowsData ?? []).map((x) => x.title))}`,
        (colsBack.rows ?? 0) > 0
          ? 'ORPHAN: ستون‌ها بعد از حذف board باقی مانده‌اند'
          : 'شواهد قطعی حذف فیزیکی ستون‌ها'
      )

      report.record(
        (cardsBack.rows ?? 0) === 0 ? STATUS.PASS : STATUS.FAIL,
        'کارت‌های board حذف‌شده واقعاً ناپدید شده‌اند (CASCADE دو سطحی)',
        'پس از زنده‌سازی هیچ card برنگردد',
        `${cardsBack.rows} کارت برگشت: ${JSON.stringify((cardsBack.rowsData ?? []).map((x) => x.title))}`,
        (cardsBack.rows ?? 0) > 0
          ? 'ORPHAN: کارت‌ها باقی مانده‌اند ⇒ cascade زنجیره‌ای وجود ندارد'
          : 'شواهد قطعی حذف فیزیکی کارت‌ها'
      )
    }
    await restA.write('DELETE', 'boards', { id: probeBoardId })
  }

  report.section('۴) جهت INSERT روی FK — چرا مستقیماً قابل اثبات نیست')
  // تلاش برای گرفتن خطای 23503 روی cards با parent ناموجود
  const badCard = await restA.write('POST', 'cards', {
    body: { column_id: '00000000-0000-0000-0000-000000000000', title: 'orphan-attempt', position: 0 },
  })
  report.record(
    STATUS.UNVERIFIED,
    'خطای FK (23503) هنگام INSERT روی parent ناموجود',
    'کد 23503',
    badCard.toString(),
    badCard.isRlsError
      ? 'RLS قبل از FK ارزیابی می‌شود و سطر را رد می‌کند، پس خطای FK هرگز دیده نمی‌شود. ' +
        'این «کوری» امنیتی است نه نقص: نوشتن در هر حال مسدود شده. برای اثبات خودِ FK ' +
        'باید از pg_constraint خواند (نیازمند SQL).'
      : badCard.code === '23503'
        ? 'خطای FK مستقیماً دیده شد'
        : 'رفتار غیرمنتظره — نیاز به بررسی'
  )

  const badColumn = await restA.write('POST', 'columns', {
    body: { board_id: '00000000-0000-0000-0000-000000000000', title: 'orphan-attempt', position: 0 },
  })
  report.record(
    badColumn.code === '23503' ? STATUS.PASS : STATUS.UNVERIFIED,
    'خطای FK روی columns با board ناموجود',
    'کد 23503',
    badColumn.toString(),
    badColumn.isRlsError
      ? 'باز هم RLS جلوتر از FK اجرا می‌شود'
      : 'نیازمند SQL برای اثبات تعریف FK'
  )

  report.section('۵) مواردی که از این مسیر قابل اثبات نیستند')
  for (const item of [
    'ON UPDATE (مثلاً تغییر board_id یک ستون) — هیچ مسیر نوشتنی در اپ وجود ندارد',
    'ON DELETE SET NULL — با همین آزمون قابل تفکیک از CASCADE نیست اگر ستون NOT NULL باشد',
    'نام و تعریف دقیق constraintها در pg_constraint',
    'اینکه FK واقعاً DEFERRABLE است یا نه',
  ]) {
    report.record(STATUS.UNVERIFIED, item, 'خواندن از pg_constraint', 'فقط از طریق SQL ممکن است')
  }
})

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0
