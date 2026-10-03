/**
 * ۰۴ — RPCهای move_cards و move_columns.
 *
 * این توابع `security invoker` هستند، پس RLS همچنان اجرا می‌شود. ولی طبق
 * توضیح خود migration، RLS به‌تنهایی جلوی یک حمله‌ی مشخص را *نمی‌گیرد*:
 * کاربری که مالک کارت است اجازه‌ی UPDATE آن کارت را دارد، و column_id فقط یک
 * مقدار است. یک FK فقط وجود id مقصد را چک می‌کند، نه مالکیتش را. پس بدون
 * بررسی صریح، کاربر می‌تواند کارت خودش را به ستونِ بوردِ کاربر دیگر بچسباند.
 *
 * محور اصلی این تست همان است: آیا جابه‌جایی به بوردِ دیگر رد می‌شود؟
 * تست دوم اتمی بودن است: اگر یکی از سطرهای batch نامعتبر باشد، هیچ‌کدام
 * نباید اعمال شوند.
 */

import { Report, STATUS, uuid } from './helpers/harness.mjs'
import { withScenario, gated } from './helpers/scenario.mjs'

const report = new Report('۰۴ — RPCهای move_cards و move_columns')

await withScenario(async (ctx) => {
  const { restA, restB, fixture, b } = ctx
  const board = fixture.board
  const [col1, col2] = fixture.columns
  const [card1, card2] = fixture.cards

  /** B یک بورد و ستون خودش می‌سازد تا مقصد «بوردِ دیگر» داشته باشیم. */
  const bBoard = await restB.write('POST', 'boards', {
    body: { title: 'board-of-B-for-move-test', created_by: b.id },
  })
  const bBoardId = bBoard.rowsData[0].id
  const bColumn = await restB.write('POST', 'columns', {
    body: { board_id: bBoardId, title: 'col-of-B', position: 0 },
  })
  const bColumnId = bColumn.rowsData[0].id

  // ستون سوم روی بورد خود A، برای تست جابه‌جایی بین دو ستونِ یک بورد
  const col3 = await restA.write('POST', 'columns', {
    body: { board_id: board.id, title: 'col3-of-A', position: 5 },
  })
  const col3Id = col3.rowsData[0].id

  const rpc = (rest, fn, payload) =>
    rest.post(`/rest/v1/rpc/${fn}`, { body: { p_moves: payload } })

  const readCard = async (id) => {
    const r = await restA.get(`/rest/v1/cards?id=eq.${id}&select=position,column_id`)
    return r.rowsData?.[0] ?? null
  }

  report.section('۱) کنترل مثبت — جابه‌جایی معتبر داخل بورد خودِ A')
  const before = await readCard(card1.id)
  const okMove = await rpc(restA, 'move_cards', [{ id: card1.id, column_id: col2.id, position: 3 }])
  report.check(
    'move_cards روی جابه‌جایی معتبر موفق است (void ⇒ 204)',
    okMove.status === 204 || okMove.status === 200,
    'status=204',
    okMove.toString()
  )
  const after = await readCard(card1.id)
  report.check(
    'کارت واقعاً به ستون مقصد با position جدید منتقل شد',
    after?.column_id === col2.id && Number(after?.position) === 3,
    `column_id=${col2.id} position=3`,
    JSON.stringify(after),
    'وضعیت پیش از جابه‌جایی: ' + JSON.stringify(before)
  )

  // برگرداندن کارت به ستون اول برای تست‌های بعدی
  await rpc(restA, 'move_cards', [{ id: card1.id, column_id: col1.id, position: 0 }])

  report.section('۲) مهم‌ترین تست امنیتی: کارت A به ستونِ بوردِ B')
  const crossMove = await rpc(restA, 'move_cards', [
    { id: card1.id, column_id: bColumnId, position: 0 },
  ])
  report.check(
    'A نمی‌تواند کارت خودش را به ستونِ بورد کاربر B بچسباند',
    crossMove.status >= 400,
    'رد شود (42501)',
    crossMove.toString(),
    crossMove.status < 400
      ? 'آسیب‌پذیری: کارت به بورد دیگر نشت کرد'
      : 'بررسی مالکیت مقصد در خود تابع کار می‌کند'
  )
  const afterCross = await readCard(card1.id)
  report.check(
    'کارت سر جایش مانده و جابه‌جا نشده',
    afterCross?.column_id === col1.id,
    `column_id=${col1.id}`,
    JSON.stringify(afterCross)
  )

  report.section('۳) اتمی بودن — batch نیمه‌معتبر نباید چیزی اعمال کند')
  const posBefore = await readCard(card2.id)
  const mixedBatch = await rpc(restA, 'move_cards', [
    { id: card2.id, column_id: col3.id, position: 7 }, // معتبر
    { id: card1.id, column_id: bColumnId, position: 0 }, // نامعتبر: بورد دیگر
  ])
  report.check('batch نیمه‌معتبر رد می‌شود', mixedBatch.status >= 400, 'status>=400', mixedBatch.toString())
  const posAfter = await readCard(card2.id)
  report.check(
    'سطر معتبر batch هم اعمال نشده (rollback اتمیک)',
    Number(posAfter?.position) === Number(posBefore?.position),
    `position=${posBefore?.position} (بدون تغییر)`,
    `position=${posAfter?.position}`,
    'اگر این FAIL شود یعنی جابه‌جایی جزئی انجام می‌شود و داده ناسازگار می‌ماند'
  )

  report.section('۴) اعتبارسنجی ورودی move_cards')
  const cases = [
    ['شناسه ناموجود', [{ id: uuid(), column_id: col1.id, position: 0 }]],
    ['مقصد ناموجود', [{ id: card1.id, column_id: uuid(), position: 0 }]],
    ['position به‌صورت رشته', [{ id: card1.id, column_id: col1.id, position: '4' }]],
    ['id نامعتبر (غیر uuid)', [{ id: 'not-a-uuid', column_id: col1.id, position: 0 }]],
    [
      'شناسه تکراری',
      [
        { id: card1.id, column_id: col1.id, position: 0 },
        { id: card1.id, column_id: col1.id, position: 1 },
      ],
    ],
    ['ورودی object به‌جای آرایه', { id: card1.id }],
    ['ورودی null', null],
    ['فیلد position غایب', [{ id: card1.id, column_id: col1.id }]],
  ]
  for (const [name, payload] of cases) {
    const r = await rpc(restA, 'move_cards', payload)
    report.check(`move_cards رد می‌کند: ${name}`, r.status >= 400, 'status>=400', r.toString())
  }

  report.section('۴ب) position اعشاری باید *پذیرفته* و بدون گرد شدن ذخیره شود')
  // این مورد قبلاً در فهرست «باید رد شود» بود و FAIL می‌داد، ولی انتظار اشتباه
  // بود: migration مربوط به fractional indexing، ستون position را
  // `double precision` می‌کند و کل الگوریتم جای‌جایی در lib/board/layout.ts
  // روی position اعشاری تکیه دارد. پس رد کردن 2.5 نه‌تنها لازم نیست، بلکه
  // خلاف طراحی است.
  //
  // نکته‌ی امنیتی/درستی که اینجا واقعاً سنجیده می‌شود: اگر ستون در دیتابیس
  // `int4` مانده بود، `2.5::int4` بی‌صدا گرد می‌شد (بدون خطا) و دو کارتِ
  // با position نزدیک به هم به یک عدد می‌افتادند — داده‌ی ناسازگار، بی‌صدا.
  // پس assertions این بخش «۲.۵ دقیقاً ۲.۵ می‌ماند» را می‌سنجد، نه فقط 204.
  const fracMove = await rpc(restA, 'move_cards', [
    { id: card1.id, column_id: col1.id, position: 2.5 },
  ])
  gated(
    report,
    ctx,
    fracMove.status === 204 || fracMove.status === 200,
    'move_cards position اعشاری را می‌پذیرد',
    'status=204',
    fracMove.toString()
  )
  const fracRead = await restA.get(
    `/rest/v1/cards?id=eq.${card1.id}&select=id,position`
  )
  const fracValue = Number(fracRead.rowsData?.[0]?.position)
  gated(
    report,
    ctx,
    fracValue === 2.5,
    'position اعشاری دقیقاً ذخیره می‌شود (گرد نمی‌شود ⇒ ستون double precision است)',
    'position === 2.5',
    `position=${fracRead.rowsData?.[0]?.position}`,
    'اگر 2 یا 3 شد یعنی ستون در دیتابیس live هنوز int4 است و fractional indexing روی آن کار نمی‌کند'
  )
  // بازگرداندن به حالت اول
  await rpc(restA, 'move_cards', [{ id: card1.id, column_id: col1.id, position: 0 }])

  report.section('۵) move_columns')
  const okColMove = await rpc(restA, 'move_columns', [
    { id: col1.id, position: 4 },
    { id: col2.id, position: 1 },
  ])
  report.check(
    'move_columns روی جابه‌جایی معتبر موفق است',
    okColMove.status === 204 || okColMove.status === 200,
    'status=204',
    okColMove.toString()
  )
  const colsAfter = await restA.get(
    `/rest/v1/columns?board_id=eq.${board.id}&select=id,position&limit=100`
  )
  const p1 = colsAfter.rowsData?.find((c) => c.id === col1.id)?.position
  const p2 = colsAfter.rowsData?.find((c) => c.id === col2.id)?.position
  report.check(
    'position ستون‌ها واقعاً به‌روزرسانی شد',
    Number(p1) === 4 && Number(p2) === 1,
    'col1=4 و col2=1',
    `col1=${p1} و col2=${p2}`
  )

  report.section('۶) امنیت move_columns')
  const bColBefore = await restB.get(`/rest/v1/columns?id=eq.${bColumnId}&select=position`)
  const attack = await rpc(restA, 'move_columns', [{ id: bColumnId, position: 42 }])
  report.check(
    'A نمی‌تواند position ستونِ B را عوض کند',
    attack.status >= 400,
    'رد شود (42501)',
    attack.toString()
  )
  const bColAfter = await restB.get(`/rest/v1/columns?id=eq.${bColumnId}&select=position`)
  report.check(
    'position ستون B دست‌نخورده ماند',
    Number(bColAfter.rowsData?.[0]?.position) === Number(bColBefore.rowsData?.[0]?.position),
    `position=${bColBefore.rowsData?.[0]?.position}`,
    `position=${bColAfter.rowsData?.[0]?.position}`
  )

  // col1 و col3 هر دو روی بورد A هستند ⇒ باید پذیرفته شود
  const sameBoard = await rpc(restA, 'move_columns', [
    { id: col1.id, position: 0 },
    { id: col3Id, position: 1 },
  ])
  report.check(
    'جابه‌جایی ستون‌های یک بورد (col1 و col3) پذیرفته می‌شود',
    sameBoard.status === 204 || sameBoard.status === 200,
    'status=204',
    sameBoard.toString()
  )

  // یک ستون از A و یک ستون از B در یک batch ⇒ باید رد شود
  const mixedBoards = await rpc(restA, 'move_columns', [
    { id: col1.id, position: 0 },
    { id: bColumnId, position: 1 },
  ])
  report.check(
    'batch شامل ستون A و ستون B رد می‌شود',
    mixedBoards.status >= 400,
    'status>=400',
    mixedBoards.toString()
  )

  report.section('۷) موارد خاص')
  const emptyMove = await rpc(restA, 'move_cards', [])
  report.check(
    'آرایه‌ی خالی بدون خطا و بدون تغییر برمی‌گردد',
    emptyMove.status === 204 || emptyMove.status === 200,
    'status=204',
    emptyMove.toString(),
    'رفتار عمدی: تابع قبل از بررسی auth، آرایه‌ی خالی را return می‌کند'
  )

  const anonRpc = await ctx.anon.post('/rest/v1/rpc/move_cards', {
    body: { p_moves: [{ id: card1.id, column_id: col1.id, position: 0 }] },
  })
  report.check(
    'کاربر ناشناس (anon) نمی‌تواند move_cards را صدا بزند',
    anonRpc.status >= 400,
    'رد شود (42501 / permission denied)',
    anonRpc.toString(),
    anonRpc.message.includes('permission denied')
      ? 'لایه‌ی اول (REVOKE از anon) کار می‌کند'
      : ''
  )

  // پاک‌سازی داده‌ی B
  await restB.write('DELETE', 'columns', { id: bColumnId })
  await restB.write('DELETE', 'boards', { id: bBoardId })
  await restA.write('DELETE', 'columns', { id: col3Id })

  report.section('۸) مواردی که از این مسیر قابل اثبات نیستند')
  for (const item of [
    'اینکه تابع واقعاً security invoker است (رفتار با definer هم می‌تواند یکسان باشد)',
    'مقدار دقیق search_path تنظیم‌شده روی تابع',
    'نوع دقیق ستون position (integer در برابر numeric)',
  ]) {
    report.record(STATUS.UNVERIFIED, item, 'خواندن از pg_proc', 'فقط از طریق SQL ممکن است')
  }
})

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0
