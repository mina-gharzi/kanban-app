/**
 * ۰۱ — ایزوله‌ی مالکیت (ownership) و عدم دسترسی بین کاربران.
 *
 * مدل امنیتی: auth.uid() → boards.created_by → columns.board_id → cards.column_id
 * همکاری/اشتراک‌گذاری در scope نیست، پس کاربر B نباید هیچ دسترسی به داده‌ی
 * A داشته باشد.
 *
 * نکته‌ی کلیدی این تست: «۰ سطر برگشت» به‌تنهایی اثبات نیست که چیزی تغییر
 * نکرده. اگر UPDATE با RLS بسته شود PostgREST هم [] برمی‌گرداند، ولی اگر
 * ساختار اشتباه باشد ممکن است واقعاً چیزی نوشته شود و باز هم [] برگردد.
 * پس بعد از هر تلاشِ نفوذ، داده‌ی A دوباره خوانده و دست‌نخورده بودنش تأیید
 * می‌شود.
 */

import { Report, STATUS } from './helpers/harness.mjs'
import { withScenario, gated } from './helpers/scenario.mjs'
import { uuid } from './helpers/harness.mjs'

const report = new Report('۰۱ — ownership و ایزوله‌ی بین‌کاربری')

await withScenario(async (ctx) => {
  const { restA, restB, fixture, b } = ctx
  const board = fixture.board
  const column = fixture.columns[0]
  const card = fixture.cards[0]

  // عنوان‌های اصلی را نگه می‌داریم تا دست‌نخورده بودن را بسنجیم
  const snapshot = {
    boardTitle: board.title,
    columnTitle: column.title,
    cardTitle: card.title,
  }

  report.section('۱) کنترل مثبت — A روی داده‌ی خودش')
  const aRead = await restA.get(`/rest/v1/boards?id=eq.${board.id}&select=id,title`)
  report.record(
    aRead.status === 200 && aRead.rows === 1 ? STATUS.PASS : STATUS.FAIL,
    'A می‌تواند board خودش را بخواند',
    'status=200 rows=1',
    aRead.toString()
  )

  const aUpdate = await restA.write('PATCH', 'boards', {
    id: board.id,
    body: { title: 'owned-by-A-updated' },
  })
  report.record(
    aUpdate.status === 200 && aUpdate.rows === 1 ? STATUS.PASS : STATUS.FAIL,
    'A می‌تواند board خودش را تغییر دهد',
    'rows=1 (وگرنه assertRowsAffected اپلیکیشن خطا می‌دهد)',
    aUpdate.toString()
  )
  // برگرداندن به حالت اول
  await restA.write('PATCH', 'boards', { id: board.id, body: { title: snapshot.boardTitle } })

  report.section('۲) خواندن — B نباید داده‌ی A را ببیند')
  for (const [table, row, label] of [
    ['boards', board, 'board'],
    ['columns', column, 'column'],
    ['cards', card, 'card'],
  ]) {
    const r = await restB.get(`/rest/v1/${table}?id=eq.${row.id}&select=id`)
    gated(
      report,
      ctx,
      r.status === 200 && r.rows === 0,
      `B نمی‌تواند ${label} متعلق به A را بخواند`,
      'status=200 rows=0',
      r.toString()
    )
  }

  report.section('۳) UPDATE — B نباید بتواند داده‌ی A را تغییر دهد')
  const bUpdateBoard = await restB.write('PATCH', 'boards', {
    id: board.id,
    body: { title: 'HIJACKED-BY-B' },
  })
  gated(
    report,
    ctx,
    bUpdateBoard.status === 200 && bUpdateBoard.rows === 0,
    'B نمی‌تواند title یک board از A را عوض کند',
    'rows=0 (تغییری اعمال نشود)',
    bUpdateBoard.toString(),
    bUpdateBoard.isRlsError
      ? 'RLS جلویش را گرفت'
      : 'RLS سطر را نامرئی کرد؛ اثبات دست‌نخورده بودن در بخش ۵ می‌آید'
  )

  const bUpdateColumn = await restB.write('PATCH', 'columns', {
    id: column.id,
    body: { title: 'HIJACKED-BY-B', position: 999 },
  })
  gated(
    report,
    ctx,
    bUpdateColumn.status === 200 && bUpdateColumn.rows === 0,
    'B نمی‌تواند title/position یک column از A را عوض کند',
    'rows=0',
    bUpdateColumn.toString()
  )

  const bUpdateCard = await restB.write('PATCH', 'cards', {
    id: card.id,
    body: { title: 'HIJACKED-BY-B', position: 999 },
  })
  gated(
    report,
    ctx,
    bUpdateCard.status === 200 && bUpdateCard.rows === 0,
    'B نمی‌تواند title/position یک card از A را عوض کند',
    'rows=0',
    bUpdateCard.toString()
  )

  report.section('۴) DELETE — B نباید بتواند داده‌ی A را حذف کند')
  const bDeleteCard = await restB.write('DELETE', 'cards', { id: card.id })
  gated(
    report,
    ctx,
    bDeleteCard.status === 200 && bDeleteCard.rows === 0,
    'B نمی‌تواند card متعلق به A را حذف کند',
    'rows=0',
    bDeleteCard.toString()
  )

  const bDeleteColumn = await restB.write('DELETE', 'columns', { id: column.id })
  gated(
    report,
    ctx,
    bDeleteColumn.status === 200 && bDeleteColumn.rows === 0,
    'B نمی‌تواند column متعلق به A را حذف کند',
    'rows=0',
    bDeleteColumn.toString()
  )

  const bDeleteBoard = await restB.write('DELETE', 'boards', { id: board.id })
  gated(
    report,
    ctx,
    bDeleteBoard.status === 200 && bDeleteBoard.rows === 0,
    'B نمی‌تواند board متعلق به A را حذف کند',
    'rows=0',
    bDeleteBoard.toString()
  )

  report.section('۵) تأیید دست‌نخورده بودن داده‌ی A (مهم‌تر از صفرِ برگشتی)')
  // اگر یکی از UPDATEهای بالا واقعاً نوشته شده بود، اینجا لو می‌رود.
  const stillThere = await restA.get(
    `/rest/v1/cards?id=eq.${card.id}&select=id,title,position,column_id`
  )
  const cardRow = stillThere.rowsData?.[0]
  gated(
    report,
    ctx,
    !!cardRow && cardRow.title === snapshot.cardTitle,
    'card متعلق به A هنوز عنوان اصلی را دارد',
    `title=${snapshot.cardTitle}`,
    cardRow ? `title=${cardRow.title}` : 'کارت پیدا نشد ⇒ شاید حذف شده!',
    'اگر این FAIL شود یعنی RLS نوشتنِ ناخواسته را متوقف نکرده است'
  )

  const colStill = await restA.get(`/rest/v1/columns?id=eq.${column.id}&select=id,title,position`)
  const colRow = colStill.rowsData?.[0]
  gated(
    report,
    ctx,
    !!colRow && colRow.title === snapshot.columnTitle && colRow.position === 0,
    'column متعلق به A هنوز عنوان و position اصلی را دارد',
    `title=${snapshot.columnTitle} position=0`,
    colRow ? `title=${colRow.title} position=${colRow.position}` : 'ستون پیدا نشد ⇒ شاید حذف شده!'
  )

  const boardStill = await restA.get(`/rest/v1/boards?id=eq.${board.id}&select=id,title`)
  const boardRow = boardStill.rowsData?.[0]
  gated(
    report,
    ctx,
    !!boardRow && boardRow.title === snapshot.boardTitle,
    'board متعلق به A هنوز عنوان اصلی را دارد',
    `title=${snapshot.boardTitle}`,
    boardRow ? `title=${boardRow.title}` : 'board پیدا نشد ⇒ شاید حذف شده!'
  )

  // شمارش کل: هیچ ردیفی از A نباید کم شده باشد
  const countA = await restA.get('/rest/v1/cards?select=id&limit=100')
  gated(
    report,
    ctx,
    countA.rows === fixture.cards.length,
    'تعداد کارت‌های A هنوز کامل است',
    `${fixture.cards.length} سطر`,
    `${countA.rows} سطر`
  )

  report.section('۶) ID tampering — UUID ناموجود')
  const ghost = uuid()
  const ghostUpdate = await restA.write('PATCH', 'cards', {
    id: ghost,
    body: { title: 'ghost' },
  })
  gated(
    report,
    ctx,
    ghostUpdate.status === 200 && ghostUpdate.rows === 0,
    'UPDATE روی UUID ناموجود ۰ سطر اثر می‌گذارد',
    'rows=0',
    ghostUpdate.toString(),
    'این رفتاری است که assertRowsAffected در اپلیکیشن به آن تکیه می‌کند'
  )

  const ghostDelete = await restA.write('DELETE', 'cards', { id: ghost })
  gated(
    report,
    ctx,
    ghostDelete.status === 200 && ghostDelete.rows === 0,
    'DELETE روی UUID ناموجود ۰ سطر اثر می‌گذارد',
    'rows=0',
    ghostDelete.toString()
  )

  report.section('۷) مالکیت واقعی — هر کاربر فقط سطرهای خودش را می‌بیند')
  const bOwnBoard = await restB.write('POST', 'boards', {
    body: { title: 'board-of-B', created_by: b.id },
  })
  // INSERT موفق PostgREST کد 201 می‌دهد (نه 200) — پس باید بازه‌ی 2xx را
  // پذیرفت. در بار اول اینجا اشتباه گرفته شد و یک FAIL جعلی تولید کرد.
  gated(
    report,
    ctx,
    bOwnBoard.ok && bOwnBoard.rows === 1,
    'B می‌تواند board خودش را بسازد و ببیند',
    'status=2xx rows=1',
    bOwnBoard.toString()
  )

  if (bOwnBoard.rows === 1) {
    const bSeesOwn = await restB.get(`/rest/v1/boards?id=eq.${bOwnBoard.rowsData[0].id}&select=id,title`)
    report.record(
      bSeesOwn.status === 200 && bSeesOwn.rows === 1 ? STATUS.PASS : STATUS.FAIL,
      'B board خودش را می‌بیند',
      'rows=1',
      bSeesOwn.toString()
    )

    // پاک‌سازی board کاربر B
    await restB.write('DELETE', 'boards', { id: bOwnBoard.rowsData[0].id })
  }

  const aTotal = await restA.get('/rest/v1/boards?select=id&limit=100')
  const bTotal = await restB.get('/rest/v1/boards?select=id&limit=100')
  report.record(
    aTotal.rows === 1 && bTotal.rows === 0
      ? STATUS.PASS
      : STATUS.FAIL,
    'دیدِ A و B کاملاً جداست',
    'A فقط board خودش، B هیچ',
    `A=${aTotal.rows} سطر / B=${bTotal.rows} سطر`
  )

  report.section('۸) مواردی که از این مسیر قابل اثبات نیستند')
  for (const item of [
    'متن دقیق شرط USING/WITH CHECK در pg_policies (بدون SQL قابل خواندن نیست)',
    'اینکه GRANTها به authenticated داده شده یا از پیش‌فرض آمده',
    'رفتار superuser/service_role (عمداً آزمون نشد)',
  ]) {
    report.record(STATUS.UNVERIFIED, item, 'خواندن از pg_policies', 'فقط از طریق SQL ممکن است')
  }
})

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0
