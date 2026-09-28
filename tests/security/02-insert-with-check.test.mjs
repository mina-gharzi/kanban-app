/**
 * ۰۲ — INSERT و شرط WITH CHECK.
 *
 * این حساس‌ترین بخش است. RLS دو شرط جدا دارد:
 *   USING        → کدام سطرها را می‌توانی ببینی/تغییر بدهی/حذف کنی
 *   WITH CHECK   → چه سطر *جدیدی* اجازه داری وارد کنی
 *
 * تست ۰۱ فقط USING را می‌سنجید. یک policy که WITH CHECK ندارد یا اشتباه
 * دارد، اجازه می‌دهد کاربر B این کارها را بکند:
 *   1) یک column داخل board کاربر A بسازد (تزریق سطر)
 *   2) board بسازد که created_by آن کاربر A باشد (انتساب مالکیت جعلی)
 *
 * مورد ۲ یک آسیب‌پذیری واقعی است: در این حالت A مالک چیزی می‌شود که هرگز
 * نساخته، و B می‌تواند با دانستن شناسه‌ی A به آن دسترسی داشته باشد.
 */

import { Report, STATUS, uuid } from './helpers/harness.mjs'
import { withScenario, gated } from './helpers/scenario.mjs'

const report = new Report('۰۲ — INSERT و WITH CHECK')

await withScenario(async (ctx) => {
  const { restA, restB, fixture, a, b } = ctx
  const board = fixture.board
  const column = fixture.columns[0]

  report.section('۱) کنترل مثبت — A داخل داده‌ی خودش INSERT می‌کند')
  const ownCol = await restA.write('POST', 'columns', {
    body: { board_id: board.id, title: 'col-by-A', position: 10 },
  })
  gated(
    report,
    ctx,
    ownCol.ok && ownCol.rows === 1,
    'A می‌تواند داخل board خودش column بسازد',
    'status=2xx rows=1',
    ownCol.toString()
  )
  if (ownCol.rows === 1) {
    await restA.write('DELETE', 'columns', { id: ownCol.rowsData[0].id })
  }

  report.section('۲) تزریق سطر — B نباید بتواند داخل داده‌ی A بنویسد')

  const bInjectsColumn = await restB.write('POST', 'columns', {
    body: { board_id: board.id, title: 'INJECTED-BY-B', position: 99 },
  })
  report.record(
    bInjectsColumn.status === 401 || bInjectsColumn.isRlsError
      ? STATUS.PASS
      : STATUS.FAIL,
    'B نمی‌تواند column داخل board کاربر A بسازد',
    'رد شود با خطای RLS (WITH CHECK)',
    bInjectsColumn.toString(),
    bInjectsColumn.isRlsError
      ? 'WITH CHECK جلوی تزریق را گرفت'
      : 'اگر این سطر نوشته شده باشد، WITH CHECK روی columns ناقص است'
  )

  const bInjectsCard = await restB.write('POST', 'cards', {
    body: { column_id: column.id, title: 'INJECTED-BY-B', position: 99 },
  })
  report.record(
    bInjectsCard.status === 401 || bInjectsCard.isRlsError
      ? STATUS.PASS
      : STATUS.FAIL,
    'B نمی‌تواند card داخل column کاربر A بسازد',
    'رد شود با خطای RLS (WITH CHECK)',
    bInjectsCard.toString()
  )

  report.section('۳) انتساب مالکیت جعلی — B نباید بتواند board مالکش A باشد')
  const bForgesOwner = await restB.write('POST', 'boards', {
    body: { title: 'FORGED-OWNER', created_by: a.id },
  })
  report.record(
    bForgesOwner.status === 401 || bForgesOwner.isRlsError
      ? STATUS.PASS
      : STATUS.FAIL,
    'B نمی‌تواند board با created_by = شناسه‌ی A بسازد',
    'رد شود با خطای RLS',
    bForgesOwner.toString(),
    bForgesOwner.rows === 1
      ? 'آسیب‌پذیری جدی: B توانست مالکیت را جعل کند'
      : 'انتساب مالکیت به کاربر دیگر مسدود شد'
  )

  const bForgesOwner2 = await restB.write('POST', 'cards', {
    body: { column_id: column.id, title: 'FORGED-OWNER', position: 98 },
  })
  report.record(
    bForgesOwner2.status === 401 || bForgesOwner2.isRlsError
      ? STATUS.PASS
      : STATUS.FAIL,
    'B نمی‌تواند card داخل column کاربر A بسازد (تلاش دوم، position متفاوت)',
    'رد شود',
    bForgesOwner2.toString()
  )

  report.section('۴) کنترل مثبت — B مالکیت خودش را می‌سازد')
  const bOwn = await restB.write('POST', 'boards', {
    body: { title: 'board-of-B-2', created_by: b.id },
  })
  gated(
    report,
    ctx,
    bOwn.ok && bOwn.rows === 1,
    'B می‌تواند board با created_by = شناسه‌ی خودش بسازد',
    'status=2xx rows=1',
    bOwn.toString(),
    'اگر این هم رد می‌شد یعنی policy بیش از حد بسته است و اپ کار نمی‌کند'
  )

  if (bOwn.rows === 1) {
    const ownBoardId = bOwn.rowsData[0].id
    const bOwnCol = await restB.write('POST', 'columns', {
      body: { board_id: ownBoardId, title: 'col-of-B', position: 0 },
    })
    gated(
      report,
      ctx,
      bOwnCol.ok && bOwnCol.rows === 1,
      'B می‌تواند داخل board خودش column بسازد',
      'status=2xx rows=1',
      bOwnCol.toString()
    )
    if (bOwnCol.rows === 1) {
      const bOwnCard = await restB.write('POST', 'cards', {
        body: { column_id: bOwnCol.rowsData[0].id, title: 'card-of-B', position: 0 },
      })
      gated(
        report,
        ctx,
        bOwnCard.ok && bOwnCard.rows === 1,
        'B می‌تواند داخل column خودش card بسازد',
        'status=2xx rows=1',
        bOwnCard.toString()
      )
    }
    // پاک‌سازی کامل زنجیره‌ی B
    const bCols = await restB.get(`/rest/v1/columns?board_id=eq.${ownBoardId}&select=id`)
    for (const c of bCols.rowsData ?? []) {
      const bCards = await restB.get(`/rest/v1/cards?column_id=eq.${c.id}&select=id`)
      for (const k of bCards.rowsData ?? []) await restB.write('DELETE', 'cards', { id: k.id })
      await restB.write('DELETE', 'columns', { id: c.id })
    }
    await restB.write('DELETE', 'boards', { id: ownBoardId })
  }

  report.section('۵) تأیید نبودِ سطر فانتوم/نیمه‌نوشته‌شده')
  // اگر یکی از تزریق‌ها بالا واقعاً نوشته شده بود، اینجا دیده می‌شود.
  const aColumns = await restA.get(`/rest/v1/columns?board_id=eq.${board.id}&select=id,title`)
  const injected = (aColumns.rowsData ?? []).filter((c) =>
    /INJECTED|FORGED/.test(c.title ?? '')
  )
  report.record(
    injected.length === 0 ? STATUS.PASS : STATUS.FAIL,
    'هیچ سطر تزریق‌شده‌ای در board کاربر A باقی نمانده',
    '۰ سطر با عنوان INJECTED/FORGED',
    `${injected.length} سطر: ${JSON.stringify(injected)}`,
    'مهم: خطای RLS باید کل تراکنش را برگرداند، نه فقط همان سطر را'
  )

  const aCards = await restA.get(`/rest/v1/cards?column_id=eq.${column.id}&select=id,title`)
  const injectedCards = (aCards.rowsData ?? []).filter((c) =>
    /INJECTED|FORGED/.test(c.title ?? '')
  )
  report.record(
    injectedCards.length === 0 ? STATUS.PASS : STATUS.FAIL,
    'هیچ card تزریق‌شده‌ای باقی نمانده',
    '۰ سطر',
    `${injectedCards.length} سطر`
  )

  // شمارش کل نباید تغییر کرده باشد
  const totalCols = await restA.get(`/rest/v1/columns?board_id=eq.${board.id}&select=id&limit=100`)
  const totalCards = await restA.get(`/rest/v1/cards?select=id&limit=100`)
  report.record(
    totalCols.rows === fixture.columns.length && totalCards.rows === fixture.cards.length
      ? STATUS.PASS
      : STATUS.FAIL,
    'تعداد سطرهای A دست‌نخورده مانده',
    `${fixture.columns.length} column / ${fixture.cards.length} card`,
    `${totalCols.rows} column / ${totalCards.rows} card`
  )

  report.section('۶) INSERT روی UUID ناموجود (ترکیب FK و RLS)')
  const ghostBoard = uuid()
  const bInsertGhost = await restB.write('POST', 'columns', {
    body: { board_id: ghostBoard, title: 'ghost', position: 0 },
  })
  // اینجا نمی‌گوییم کدام‌یک اول بررسی می‌شود (RLS یا FK) — هر دو باید جلوی
  // نوشتن را بگیرند و این ترتیب در ۰۳ جداگانه سنجیده می‌شود.
  report.record(
    bInsertGhost.status >= 400 ? STATUS.PASS : STATUS.FAIL,
    'INSERT column روی board ناموجود رد می‌شود',
    'status>=400 (RLS یا FK)',
    bInsertGhost.toString()
  )

  report.section('۷) مواردی که از این مسیر قابل اثبات نیستند')
  for (const item of [
    'متن دقیق WITH CHECK در pg_policies (از رفتار استنتاج شد، نه از تعریف)',
    'اینکه آیا policy مربوطه ALL است یا فقط INSERT',
  ]) {
    report.record(STATUS.UNVERIFIED, item, 'خواندن از pg_policies', 'فقط از طریق SQL ممکن است')
  }
})

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0
