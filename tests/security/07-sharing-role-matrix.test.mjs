/**
 * ۰۷ — ماتریس نقش‌ها روی دیتابیس واقعی: owner / editor / viewer / stranger.
 *
 * چرا این فایل لازم است:
 *   تست ۰۱ ایزوله‌ی مالکیت را می‌سنجد، اما آن سناریو «اشتراک‌گذاری در scope
 *   نیست» و فقط دو بازیگر دارد: مالک و یک غریبه. migration مربوط به
 *   board_members نقش‌های editor و viewer و دو RPC دعوت/پذیرش را اضافه کرد،
 *   ولی تا پیش از این فایل هیچ تستی روی دیتابیس واقعی آن‌ها را نمی‌سنجید.
 *
 *   تست‌های `npm run test:db` همان ماتریس را روی PGlite می‌سنجند، ولی آنجا
 *   policyها از روی migration ساخته می‌شوند. اینجا اثبات می‌شود که policyهای
 *   *واقعاً روی دیتابیس متصل به .env.local اعمال شده‌اند* و با JWT واقعی کار می‌کنند.
 *
 * چرا «صفر سطر» به‌تنهایی کافی نیست:
 *   UPDATE بلاک‌شده هم [] برمی‌گرداند، پس برای ادعای منفی باید دوباره با
 *   مالک بخوانیم و مطمئن شویم داده دست‌نخورده است. این فایل همین کار را می‌کند.
 *
 * مهم‌ترین نکته — «عضوی که سطر را *می‌بیند*»:
 *   در تست ۰۲، کاربر غریبه وقتی می‌خواهد در ستون A کارت بسازد اصلاً به RLSِ cards
 *   نمی‌رسد: چون ستون را نمی‌بیند، FK جلویش را می‌گیرد (23503). آن مسیر ثابت
 *   نمی‌کند که WITH CHECK روی cards سالم است. اینجا viewer و editor عضو بوردند و
 *   ستون را *می‌بینند*، پس FK عبور می‌کند و تصمیم تماماً روی دوش RLS است.
 *   همین‌جاست که یک policy اشتباه واقعاً خودش را نشان می‌دهد.
 *
 * نکته‌های فنی که در همین فایل کشف شد و رعایت شده:
 *   ۱) PostgREST برای INSERT پاسخ ۲۰۱ می‌دهد (نه ۲۰۰) ⇒ باید با `ok` سنجید،
 *      نه `status === 200`.
 *   ۲) در `Rest.write` اگر `id` خالی باشد، کل `match` حذف می‌شود و PostgREST خطای
 *      «requires a WHERE clause» می‌دهد ⇒ برای فیلتر روی ستونی مثل user_id باید
 *      `id` را مقدار داد تا `match` اعمال شود.
 *   ۳) بدون فیلترِ board_id، مالک همه‌ی ستون‌ها/کارت‌های خودش را می‌بیند؛ پس
 *      «تعداد سطر» باید به بورد/ستونِ مورد نظر محدود شود وگرنه اشتباه می‌شود.
 */

import {
  Report,
  STATUS,
  config,
  Rest,
  createUser,
  createFixture,
  dropFixture,
  uuid,
} from './helpers/harness.mjs'

const { url, anonKey } = config()
const anon = new Rest(url, anonKey)
const report = new Report('۰۷ — ماتریس نقش‌ها (owner / editor / viewer) روی دیتابیس واقعی')

const created = []
const extras = { boards: [], columns: [], cards: [] }

try {
  // ── کاربران ───────────────────────────────────────────────────────────────
  const owner = await createUser(url, anonKey, 'OWNER')
  const editor = await createUser(url, anonKey, 'EDITOR')
  const viewer = await createUser(url, anonKey, 'VIEWER')
  const stranger = await createUser(url, anonKey, 'STRANGER')
  created.push(owner, editor, viewer, stranger)

  const asOwner = anon.asUser(owner.accessToken)
  const asEditor = anon.asUser(editor.accessToken)
  const asViewer = anon.asUser(viewer.accessToken)
  const asStranger = anon.asUser(stranger.accessToken)

  // ── داده‌ی پایه متعلق به owner ───────────────────────────────────────────
  const fixtures = await createFixture(asOwner, owner.id, {
    boards: 1,
    columnsPerBoard: 2,
    cardsPerColumn: 2,
  })
  const { board, columns, cards } = fixtures[0]
  const col = columns[0]
  const col2 = columns[1]
  const card = cards[0]

  const rpc = (rest, fn, payload) => rest.post(`/rest/v1/rpc/${fn}`, { body: payload })

  // RPCهای جابه‌جایی پارامترِ آرایه‌ای به نام p_moves دارند. اگر آرایه را
  // خام بفرستیم، PostgREST آن را «named parameter» تفسیر می‌کند و دنبال
  // تابعی با امضای move_cards(column_id, id, position) می‌گردد و خطای
  // PGRST202 می‌دهد. یعنی تستِ «ممنوع بودن» با یک فراخوانیِ malformed
  // به‌اشتباه PASS می‌شود. پس حتماً باید در p_moves بسته‌بندی شود.
  const moveCards = (rest, moves) =>
    rest.post('/rest/v1/rpc/move_cards', { body: { p_moves: moves } })
  const moveColumns = (rest, moves) =>
    rest.post('/rest/v1/rpc/move_columns', { body: { p_moves: moves } })

  /**
   * «رد شدن» واقعی با «فراخوانیِ خراب» فرق دارد.
   * اگر تابع پیدا نشود (PGRST202 / 404) تست باید FAIL شود، نه PASS؛ وگرنه یک
   * تست امنیتی می‌تواند بدون آنکه اصلاً سیاست را اجرا کند سبز شود.
   */
  const denied = (r) => r.status >= 400 && r.code !== 'PGRST202' && r.status !== 404

  // دیتابیس ایمیل را به حروف کوچک ذخیره می‌کند (lowercase). یعنی مقایسه‌ی
  // ایمیل باید case-insensitive باشد، وگرنه هر تستی که با برچسبِ دارای حروف
  // بزرگ بنویسد بی‌صدا «عضویت پیدا نشد» می‌گیرد و همه‌ی تست‌های بعدی را
  // به‌اشتباه FAIL می‌کند. این ریشه‌ی یک دور از ۱۳ FAIL کاذب بود.
  const sameEmail = (a, b) =>
    typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()
  const findInvite = (email) => (invitesVisible.rowsData ?? []).find((i) => sameEmail(i.email, email))

  // فیلترهای محدود به همین بورد تا «تعداد سطر» معنادار باشد
  const qBoard = `/rest/v1/boards?id=eq.${board.id}&select=id`
  const qColumns = `/rest/v1/columns?board_id=eq.${board.id}&select=id`
  const qCards = `/rest/v1/cards?column_id=in.(${col.id},${col2.id})&select=id`

  // کنترل مثبت — بدون این، همه‌ی «۰ سطر»های بعدی بی‌معنا می‌شوند
  const own = await asOwner.get(qBoard)
  const controlOk = own.status === 200 && own.rows === 1
  report.check(
    'کنترل مثبت: owner بوردِ خودش را می‌بیند',
    controlOk,
    'status=200 rows=1',
    own.toString(),
    'اگر این FAIL شود، نتیجه‌های این فایل قابل استناد نیست'
  )

  const gatedCheck = (name, passed, expected, actual, note) =>
    report.record(
      controlOk && passed ? STATUS.PASS : controlOk ? STATUS.FAIL : STATUS.UNVERIFIED,
      name,
      expected,
      actual,
      note
    )

  // ── دعوت و پذیرش ──────────────────────────────────────────────────────────
  report.section('۱) دعوت‌نامه‌ها و عضویت')
  const inviteEditor = await rpc(asOwner, 'invite_to_board', {
    p_board_id: board.id,
    p_email: editor.email,
    p_role: 'editor',
  })
  report.check(
    'owner می‌تواند editor را دعوت کند',
    inviteEditor.status >= 200 && inviteEditor.status < 300,
    'status=2xx',
    inviteEditor.toString()
  )

  const inviteViewer = await rpc(asOwner, 'invite_to_board', {
    p_board_id: board.id,
    p_email: viewer.email,
    p_role: 'viewer',
  })
  report.check(
    'owner می‌تواند viewer را دعوت کند',
    inviteViewer.status >= 200 && inviteViewer.status < 300,
    'status=2xx',
    inviteViewer.toString()
  )

  const invitesVisible = await asOwner.get(`/rest/v1/board_invites?board_id=eq.${board.id}&select=id,email,role`)
  const editorInvite = findInvite(editor.email)
  const viewerInvite = findInvite(viewer.email)
  report.check(
    'owner هر دو دعوت‌نامه را می‌بیند',
    !!editorInvite && !!viewerInvite,
    'دعوت editor و viewer هر دو موجود',
    `${invitesVisible.rows} دعوت`,
    'بدون این شرط، چک‌های پذیرش در عمل بی‌اثر می‌شوند'
  )

  const strangerInvites = await asStranger.get('/rest/v1/board_invites?select=id')
  gatedCheck(
    'غریبه هیچ دعوت‌نامه‌ای نمی‌بیند',
    strangerInvites.status === 200 && strangerInvites.rows === 0,
    'rows=0',
    strangerInvites.toString(),
    'دعوت‌نامه عنوان بورد را snapshot می‌کند؛ دیده شدنش یعنی افشای اطلاعات'
  )

  if (editorInvite) {
    const acc = await rpc(asEditor, 'accept_board_invite', { p_invite_id: editorInvite.id })
    report.check(
      'editor دعوتش را می‌پذیرد',
      acc.status >= 200 && acc.status < 300,
      'status=2xx',
      acc.toString()
    )
  }
  if (viewerInvite) {
    const acc = await rpc(asViewer, 'accept_board_invite', { p_invite_id: viewerInvite.id })
    report.check(
      'viewer دعوتش را می‌پذیرد',
      acc.status >= 200 && acc.status < 300,
      'status=2xx',
      acc.toString()
    )
  }

  const members = await asOwner.get(`/rest/v1/board_members?board_id=eq.${board.id}&select=email,role`)
  const roles = Object.fromEntries(
    (members.rowsData ?? []).map((m) => [(m.email ?? '').toLowerCase(), m.role])
  )
  report.check(
    'پس از پذیرش، دو عضو با نقش درست ثبت شده‌اند',
    roles[editor.email.toLowerCase()] === 'editor' && roles[viewer.email.toLowerCase()] === 'viewer',
    'editor=editor, viewer=viewer',
    `${members.rows} عضو: ${JSON.stringify(roles)}`
  )

  // ── فقط-خواندن ───────────────────────────────────────────────────────────
  report.section('۲) SELECT — چه کسی چه چیزی را می‌بیند')
  for (const [who, rest] of [
    ['owner', asOwner],
    ['editor', asEditor],
    ['viewer', asViewer],
    ['stranger', asStranger],
  ]) {
    const expected = who === 'stranger' ? 0 : 1
    for (const [table, q, count] of [
      ['boards', qBoard, expected],
      ['columns', qColumns, expected === 1 ? 2 : 0],
      ['cards', qCards, expected === 1 ? 4 : 0],
    ]) {
      const r = await rest.get(q)
      gatedCheck(
        `${who} ${expected === 1 ? 'می‌بیند' : 'نمی‌بیند'}: ${table} (انتظار ${count})`,
        r.status === 200 && r.rows === count,
        `rows=${count}`,
        r.toString()
      )
    }
  }

  // ── OWNER ────────────────────────────────────────────────────────────────
  report.section('۳) OWNER — SELECT/INSERT/UPDATE/DELETE')
  const oBoardUpd = await asOwner.write('PATCH', 'boards', { id: board.id, body: { title: 'owner-renamed' } })
  gatedCheck('owner می‌تواند بورد را تغییر نام دهد', oBoardUpd.status === 200 && oBoardUpd.rows === 1, 'rows=1', oBoardUpd.toString())

  const oNewBoard = await asOwner.write('POST', 'boards', { body: { title: 'owner-extra-board', created_by: owner.id } })
  gatedCheck('owner می‌تواند بورد بسازد', oNewBoard.ok && oNewBoard.rows === 1, 'rows=1 (و status=201)', oNewBoard.toString())
  if (oNewBoard.rows === 1) extras.boards.push(oNewBoard.rowsData[0].id)

  const oNewCol = await asOwner.write('POST', 'columns', { body: { board_id: board.id, title: 'owner-col', position: 9 } })
  gatedCheck('owner می‌تواند ستون بسازد', oNewCol.ok && oNewCol.rows === 1, 'rows=1', oNewCol.toString())
  if (oNewCol.rows === 1) extras.columns.push(oNewCol.rowsData[0].id)

  const oNewCard = await asOwner.write('POST', 'cards', { body: { column_id: col.id, title: 'owner-card', position: 9 } })
  gatedCheck('owner می‌تواند کارت بسازد', oNewCard.ok && oNewCard.rows === 1, 'rows=1', oNewCard.toString())
  if (oNewCard.rows === 1) extras.cards.push(oNewCard.rowsData[0].id)

  if (oNewCard.rows === 1) {
    const id = oNewCard.rowsData[0].id
    const upd = await asOwner.write('PATCH', 'cards', { id, body: { title: 'owner-card-edited' } })
    gatedCheck('owner می‌تواند کارت را ویرایش کند', upd.status === 200 && upd.rows === 1, 'rows=1', upd.toString())
    const del = await asOwner.write('DELETE', 'cards', { id })
    gatedCheck('owner می‌تواند کارت را حذف کند', del.status === 200 && del.rows === 1, 'rows=1', del.toString())
  }

  const oDemote = await asOwner.write('PATCH', 'board_members', {
    id: editor.id,
    match: `board_id=eq.${board.id}&user_id=eq.{id}`,
    body: { role: 'editor' },
  })
  gatedCheck(
    'owner می‌تواند نقش عضو را تغییر دهد',
    oDemote.status === 200 && oDemote.rows === 1,
    'rows=1',
    oDemote.toString(),
    'فقط ستون role قابل به‌روزرسانی است (grant ستونی)'
  )

  // ── EDITOR ───────────────────────────────────────────────────────────────
  report.section('۴) EDITOR — نوشتن روی کارت/ستون، خارج از permission ممنوع')
  const eNewCol = await asEditor.write('POST', 'columns', { body: { board_id: board.id, title: 'editor-col', position: 20 } })
  gatedCheck('editor می‌تواند ستون بسازد', eNewCol.ok && eNewCol.rows === 1, 'rows=1', eNewCol.toString())
  if (eNewCol.rows === 1) extras.columns.push(eNewCol.rowsData[0].id)

  const eNewCard = await asEditor.write('POST', 'cards', { body: { column_id: col.id, title: 'editor-card', position: 20 } })
  gatedCheck('editor می‌تواند کارت بسازد', eNewCard.ok && eNewCard.rows === 1, 'rows=1', eNewCard.toString())
  if (eNewCard.rows === 1) extras.cards.push(eNewCard.rowsData[0].id)

  if (eNewCard.rows === 1) {
    const id = eNewCard.rowsData[0].id
    const upd = await asEditor.write('PATCH', 'cards', { id, body: { title: 'editor-card-edited' } })
    gatedCheck('editor می‌تواند کارت را ویرایش کند', upd.status === 200 && upd.rows === 1, 'rows=1', upd.toString())

    const mv = await moveCards(asEditor, [{ id, column_id: col2.id, position: 1.5 }])
    gatedCheck(
      'editor می‌تواند کارت را بین ستون‌های همان بورد جابه‌جا کند',
      mv.status === 204 || mv.status === 200,
      'status=204',
      mv.toString(),
      'جابه‌جایی به ستون بوردِ خودِ کاربر مجاز است'
    )

    const del = await asEditor.write('DELETE', 'cards', { id })
    gatedCheck('editor می‌تواند کارت را حذف کند', del.status === 200 && del.rows === 1, 'rows=1', del.toString())
  }

  if (eNewCol.rows === 1) {
    const del = await asEditor.write('DELETE', 'columns', { id: eNewCol.rowsData[0].id })
    gatedCheck('editor می‌تواند ستون را حذف کند', del.status === 200 && del.rows === 1, 'rows=1', del.toString())
  }

  // --- editor: عملیات خارج از permission ---
  const eBoardUpd = await asEditor.write('PATCH', 'boards', { id: board.id, body: { title: 'HIJACKED-BY-EDITOR' } })
  gatedCheck('editor نمی‌تواند بورد را تغییر نام دهد', eBoardUpd.status === 200 && eBoardUpd.rows === 0, 'rows=0', eBoardUpd.toString())

  const eBoardDel = await asEditor.write('DELETE', 'boards', { id: board.id })
  gatedCheck('editor نمی‌تواند بورد را حذف کند', eBoardDel.status === 200 && eBoardDel.rows === 0, 'rows=0', eBoardDel.toString())

  const eMemberDel = await asEditor.write('DELETE', 'board_members', {
    id: viewer.id,
    match: `board_id=eq.${board.id}&user_id=eq.{id}`,
  })
  gatedCheck('editor نمی‌تواند عضو دیگر را حذف کند', eMemberDel.status === 200 && eMemberDel.rows === 0, 'rows=0', eMemberDel.toString())

  const eInvite = await rpc(asEditor, 'invite_to_board', { p_board_id: board.id, p_email: stranger.email, p_role: 'viewer' })
  gatedCheck(
    'editor نمی‌تواند دعوت‌نامه بسازد',
    denied(eInvite),
    'status>=4xx با فراخوانی معتبر (نه PGRST202)',
    eInvite.toString(),
    'فقط مالک دعوت می‌دهد'
  )

  const boardNow = await asOwner.get(`/rest/v1/boards?id=eq.${board.id}&select=title`)
  gatedCheck(
    'پس از تلاش editor، عنوان بورد دست‌نخورده است',
    boardNow.rowsData?.[0]?.title === 'owner-renamed',
    'title=owner-renamed',
    JSON.stringify(boardNow.rowsData?.[0]?.title),
    'اثبات می‌کند UPDATE بلاک‌شده واقعاً ننوشته، نه اینکه فقط [] برگردانده باشد'
  )

  // ── VIEWER ───────────────────────────────────────────────────────────────
  report.section('۵) VIEWER — فقط خواندن؛ هر mutation باید رد شود')
  // نکته‌ی کلیدی: viewer عضو بورد است و ستون را می‌بیند، پس FK عبور می‌کند و
  // RLS باید تصمیم بگیرد. اینجا دقیقاً جایی است که policy اشتباه لو می‌رود.
  const vCardIns = await asViewer.write('POST', 'cards', { body: { column_id: col.id, title: 'VIEWER-CARD', position: 50 } })
  gatedCheck(
    'viewer نمی‌تواند کارت بسازد (ستون را می‌بیند ⇒ تصمیم با RLS است)',
    vCardIns.status >= 400,
    'status>=400',
    vCardIns.toString(),
    vCardIns.isRlsError
      ? 'RLS جلویش را گرفت'
      : `اگر خطای دیگری بود (${vCardIns.code}) باید بررسی شود کدام لایه جلویش را گرفت`
  )

  const vColIns = await asViewer.write('POST', 'columns', { body: { board_id: board.id, title: 'VIEWER-COL', position: 50 } })
  gatedCheck(
    'viewer نمی‌تواند ستون بسازد',
    vColIns.status >= 400,
    'status>=400',
    vColIns.toString(),
    vColIns.isRlsError ? 'RLS جلویش را گرفت' : `کد خطا: ${vColIns.code}`
  )

  const vCardUpd = await asViewer.write('PATCH', 'cards', { id: card.id, body: { title: 'HIJACKED-BY-VIEWER' } })
  gatedCheck('viewer نمی‌تواند کارت را ویرایش کند', vCardUpd.status === 200 && vCardUpd.rows === 0, 'rows=0', vCardUpd.toString())

  const vCardDel = await asViewer.write('DELETE', 'cards', { id: card.id })
  gatedCheck('viewer نمی‌تواند کارت را حذف کند', vCardDel.status === 200 && vCardDel.rows === 0, 'rows=0', vCardDel.toString())

  const vColUpd = await asViewer.write('PATCH', 'columns', { id: col.id, body: { title: 'HIJACKED', position: 77 } })
  gatedCheck('viewer نمی‌تواند ستون را ویرایش کند', vColUpd.status === 200 && vColUpd.rows === 0, 'rows=0', vColUpd.toString())

  const vMove = await moveCards(asViewer, [{ id: card.id, column_id: col2.id, position: 9 }])
  gatedCheck(
    'viewer نمی‌تواند کارت را جابه‌جا کند',
    denied(vMove),
    'status>=4xx با فراخوانی معتبر (نه PGRST202)',
    vMove.toString(),
    vMove.isRlsError ? 'RLS جلویش را گرفت' : `کد خطا: ${vMove.code}`
  )

  const vMoveCols = await moveColumns(asViewer, [{ id: col.id, position: 9 }])
  gatedCheck(
    'viewer نمی‌تواند ستون را جابه‌جا کند',
    denied(vMoveCols),
    'status>=4xx با فراخوانی معتبر (نه PGRST202)',
    vMoveCols.toString(),
    vMoveCols.isRlsError ? 'RLS جلویش را گرفت' : `کد خطا: ${vMoveCols.code}`
  )

  // اثبات مکمل: موقعیت ستون و کارت واقعاً عوض نشده
  const colNow = await asOwner.get(`/rest/v1/columns?id=eq.${col.id}&select=position,title`)
  const cardNow2 = await asOwner.get(`/rest/v1/cards?id=eq.${card.id}&select=position,column_id`)
  gatedCheck(
    'پس از تلاش viewer برای جابه‌جایی، هیچ موقعیتی تغییر نکرد',
    Number(colNow.rowsData?.[0]?.position) !== 77 && cardNow2.rowsData?.[0]?.column_id === card.column_id,
    'ستون جابه‌جا نشده و کارت در ستون خودش است',
    `col.position=${colNow.rowsData?.[0]?.position} card.column_id=${cardNow2.rowsData?.[0]?.column_id}`,
    'مکملِ «رد شدن» تا مطمئن شویم واقعاً چیزی جابه‌جا نشده'
  )

  const vBoardUpd = await asViewer.write('PATCH', 'boards', { id: board.id, body: { title: 'HIJACKED-BY-VIEWER' } })
  gatedCheck('viewer نمی‌تواند بورد را تغییر نام دهد', vBoardUpd.status === 200 && vBoardUpd.rows === 0, 'rows=0', vBoardUpd.toString())

  const cardStill = await asOwner.get(`/rest/v1/cards?id=eq.${card.id}&select=title`)
  gatedCheck(
    'کارت اصلی پس از تلاش‌های viewer کاملاً دست‌نخورده است',
    cardStill.rowsData?.[0]?.title === card.title,
    `title=${card.title}`,
    JSON.stringify(cardStill.rowsData?.[0]?.title),
    'مکملِ «rows=0» برای اثبات اینکه چیزی نوشته نشده'
  )

  // ── غیرمجاز بودن ساخت مستقیم membership/invite ───────────────────────────
  report.section('۶) عضویت و دعوت فقط از راه RPC')
  for (const [who, rest] of [
    ['owner', asOwner],
    ['editor', asEditor],
    ['viewer', asViewer],
    ['stranger', asStranger],
  ]) {
    const r = await rest.write('POST', 'board_members', {
      body: { board_id: board.id, user_id: stranger.id, role: 'editor', email: stranger.email },
    })
    gatedCheck(
      `${who} نمی‌تواند عضویت را مستقیم بسازد`,
      r.status >= 400,
      'status>=400',
      r.toString(),
      'سطح جدول INSERT revoke شده؛ فقط accept_board_invite مجاز است'
    )
  }

  for (const [who, rest] of [
    ['owner', asOwner],
    ['editor', asEditor],
    ['viewer', asViewer],
  ]) {
    const r = await rest.write('POST', 'board_invites', {
      body: { board_id: board.id, email: stranger.email, role: 'viewer', board_title: 'x' },
    })
    gatedCheck(`${who} نمی‌تواند دعوت‌نامه را مستقیم بسازد`, r.status >= 400, 'status>=400', r.toString())
  }

  const rewriteMember = await asOwner.write('PATCH', 'board_members', {
    id: stranger.id,
    match: `board_id=eq.${board.id}&user_id=eq.{id}`,
    body: { user_id: stranger.id },
  })
  gatedCheck(
    'حتی owner نمی‌تواند user_id عضو را بازنویسی کند',
    rewriteMember.status >= 400 || rewriteMember.rows === 0,
    'status>=400 یا rows=0',
    rewriteMember.toString(),
    'grant فقط روی ستون role است'
  )

  // ── لغو عضویت ────────────────────────────────────────────────────────────
  report.section('۷) لغو عضویت — دسترسی باید فوراً قطع شود')
  const removeEditor = await asOwner.write('DELETE', 'board_members', {
    id: editor.id,
    match: `board_id=eq.${board.id}&user_id=eq.{id}`,
  })
  gatedCheck('owner می‌تواند عضو را حذف کند', removeEditor.status === 200 && removeEditor.rows === 1, 'rows=1', removeEditor.toString())

  for (const [table, q] of [
    ['boards', qBoard],
    ['columns', qColumns],
    ['cards', qCards],
  ]) {
    const r = await asEditor.get(q)
    gatedCheck(`editor حذف‌شده دیگر ${table} را نمی‌بیند`, r.status === 200 && r.rows === 0, 'rows=0', r.toString())
  }
  const editorWriteAfter = await asEditor.write('POST', 'cards', { body: { column_id: col.id, title: 'AFTER-REVOKE', position: 60 } })
  gatedCheck('editor حذف‌شده دیگر نمی‌نویسد', editorWriteAfter.status >= 400, 'status>=400', editorWriteAfter.toString())

  // ── ترک بورد ─────────────────────────────────────────────────────────────
  report.section('۸) عضو می‌تواند خودش را ترک کند، ولی دیگری را نه')
  const vRemoveOther = await asViewer.write('DELETE', 'board_members', {
    id: owner.id,
    match: `board_id=eq.${board.id}&user_id=eq.{id}`,
  })
  gatedCheck(
    'viewer نمی‌تواند عضو دیگری را حذف کند',
    vRemoveOther.status === 200 && vRemoveOther.rows === 0,
    'rows=0',
    vRemoveOther.toString()
  )

  const vLeave = await asViewer.write('DELETE', 'board_members', {
    id: viewer.id,
    match: `board_id=eq.${board.id}&user_id=eq.{id}`,
  })
  gatedCheck('viewer می‌تواند خودش را حذف کند (ترک بورد)', vLeave.status === 200 && vLeave.rows === 1, 'rows=1', vLeave.toString())

  const vAfterLeave = await asViewer.get(qBoard)
  gatedCheck('پس از ترک بورد، بورد را نمی‌بیند', vAfterLeave.status === 200 && vAfterLeave.rows === 0, 'rows=0', vAfterLeave.toString())

  // ── بورد با UUID تصادفی ──────────────────────────────────────────────────
  report.section('۹) دسترسی به بورد با شناسه‌ی تصادفی')
  const ghost = uuid()
  for (const [who, rest] of [
    ['editor', asEditor],
    ['viewer', asViewer],
    ['stranger', asStranger],
  ]) {
    const r = await rest.get(`/rest/v1/boards?id=eq.${ghost}&select=id,title`)
    gatedCheck(`${who} چیزی برای UUID تصادفی نمی‌بیند`, r.status === 200 && r.rows === 0, 'rows=0', r.toString())
  }
  const sInvite = await asStranger.get(`/rest/v1/board_invites?board_id=eq.${ghost}&select=id`)
  gatedCheck('غریبه دعوت‌نامه‌ی UUID تصادفی نمی‌بیند', sInvite.status === 200 && sInvite.rows === 0, 'rows=0', sInvite.toString())

  // ── پاک‌سازی ──────────────────────────────────────────────────────────────
  report.section('۱۰) پاک‌سازی')
  // بورد/ستون/کارت‌هایی که در طول تست ساخته شدند باید هم پاک شوند، وگرنه
  // «بورد باقی نمانده» همیشه FAIL می‌شود و سیگنال را خراب می‌کند.
  for (const id of extras.cards) await asOwner.write('DELETE', 'cards', { id })
  for (const id of extras.columns) await asOwner.write('DELETE', 'columns', { id })
  for (const id of extras.boards) await asOwner.write('DELETE', 'boards', { id })
  const stats = await dropFixture(asOwner, fixtures)
  console.log(`  حذف fixture: ${JSON.stringify(stats)}`)

  const leftoverBoards = await asOwner.get('/rest/v1/boards?select=id&limit=50')
  report.check(
    'پس از پاک‌سازی هیچ بوردی از owner باقی نمانده',
    leftoverBoards.rows === 0,
    'rows=0',
    leftoverBoards.toString(),
    'اگر باقی مانده، یعنی منبع نشتی یا پاک‌سازی ناقص است'
  )
  const leftoverCards = await asOwner.get('/rest/v1/cards?select=id&limit=100')
  report.check('هیچ کارتی از owner باقی نمانده', leftoverCards.rows === 0, 'rows=0', leftoverCards.toString())
} catch (e) {
  report.record(STATUS.FAIL, 'اجرای سناریو بدون خطا', 'اجرای کامل', `EXCEPTION: ${e.message}`)
  console.error(e)
} finally {
  console.log('\n  حساب‌های auth ساخته‌شده (بدون service_role قابل حذف نیستند):')
  for (const u of created) console.log(`    ${u.label}: ${u.email}`)
  console.log('  دامنه example.test است تا به هیچ inbox واقعی نرسد.')
}

const counts = report.summary()
process.exitCode = counts.FAIL > 0 ? 1 : 0