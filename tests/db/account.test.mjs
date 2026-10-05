import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { asAnon, asUser, createDb } from './harness.mjs'

let db
const ID = (n) => `00000000-0000-4000-8000-00000000000${n}`
const U = {
  leaver:  { id: ID(1), email: 'leaver@x.com' },
  editor:  { id: ID(2), email: 'editor@x.com' },
  viewer:  { id: ID(3), email: 'viewer@x.com' },
  other:   { id: ID(4), email: 'other@x.com' },
}
const PW = 'correct horse battery'
const q = (sql, params) => db.query(sql, params)
const as = (u, fn) => asUser(db, u, fn)
const fails = (p) => expect(p).rejects.toThrow()
const del = (u, pw = PW, mode = 'transfer') => as(u, () => q('select public.delete_my_account($1,$2)', [pw, mode]))
const preview = async (u) => (await as(u, () => q('select public.account_deletion_preview() as p'))).rows[0].p

let soloBoard, sharedBoard, viewerOnlyBoard, otherBoard

beforeAll(async () => { db = await createDb() })

beforeEach(async () => {
  await db.exec('truncate public.boards, auth.users cascade')
  for (const u of Object.values(U)) {
    await q(`insert into auth.users (id,email,email_confirmed_at,encrypted_password) values ($1,$2,now(), extensions.crypt($3, extensions.gen_salt('bf')))`, [u.id, u.email, PW])
  }
  const mk = async (owner, title) => as(owner, async () => {
    const b = (await q(`insert into public.boards (title,created_by) values ($1,$2) returning id`, [title, owner.id])).rows[0].id
    const c = (await q(`insert into public.columns (board_id,title,position) values ($1,'c',0) returning id`, [b])).rows[0].id
    await q(`insert into public.cards (column_id,title,position) values ($1,'k',0)`, [c])
    return b
  })
  soloBoard = await mk(U.leaver, 'solo')
  sharedBoard = await mk(U.leaver, 'shared')
  viewerOnlyBoard = await mk(U.leaver, 'viewers-only')
  otherBoard = await mk(U.other, 'others')

  const join = async (board, user, role, delayMs) => {
    await as(U.leaver, () => q('select public.invite_to_board($1,$2,$3)', [board, user.email, role]))
    await as(user, async () => { const id = (await q('select id from public.board_invites where email=$1', [user.email])).rows[0].id; await q('select public.accept_board_invite($1)', [id]) })
    await q(`update public.board_members set created_at = now() + ($1 || ' seconds')::interval where board_id=$2 and user_id=$3`, [String(delayMs), board, user.id])
  }
  await join(sharedBoard, U.viewer, 'viewer', 1)      // قدیمی‌تر ولی viewer
  await join(sharedBoard, U.editor, 'editor', 5)      // جدیدتر ولی editor ⇒ باید مالک شود
  await join(viewerOnlyBoard, U.viewer, 'viewer', 1)
  // leaver هم عضو بوردِ دیگری است + یک دعوت معلق دریافتی + دعوتی که خودش فرستاده
  await as(U.other, () => q('select public.invite_to_board($1,$2,$3)', [otherBoard, U.leaver.email, 'editor']))
  await as(U.leaver, async () => { const id = (await q(`select id from public.board_invites where email=$1`, [U.leaver.email])).rows[0].id; await q('select public.accept_board_invite($1)', [id]) })
  await as(U.other, () => q('select public.invite_to_board($1,$2,$3)', [otherBoard, 'pending-to-leaver@x.com', 'viewer']))
  await as(U.leaver, () => q('select public.invite_to_board($1,$2,$3)', [soloBoard, 'someone@x.com', 'viewer']))
})

const count = async (sql, params) => (await q(sql, params)).rows[0].n

describe('account_deletion_preview', () => {
  it('summarises what will happen, including who inherits shared boards', async () => {
    const p = await preview(U.leaver)
    expect(p.solo_boards).toBe(1)
    expect(p.memberships).toBe(1)
    const byTitle = Object.fromEntries(p.shared_boards.map((b) => [b.title, b]))
    expect(Object.keys(byTitle).sort()).toEqual(['shared', 'viewers-only'])
    expect(byTitle.shared.new_owner_email).toBe('editor@x.com')           // editor بر viewer مقدم است
    expect(byTitle['viewers-only'].new_owner_email).toBe('viewer@x.com')  // در نبود editor، قدیمی‌ترین عضو
  })
  it('is only for the caller and needs a session', async () => {
    expect((await preview(U.other)).solo_boards).toBe(0)
    await fails(asAnon(db, () => q('select public.account_deletion_preview()')))
  })
})

describe('delete_my_account', () => {
  it('rejects a wrong or missing password and changes nothing', async () => {
    await fails(del(U.leaver, 'wrong password'))
    await fails(del(U.leaver, null))
    expect(await count('select count(*)::int n from auth.users where id=$1', [U.leaver.id])).toBe(1)
    expect(await count('select count(*)::int n from public.boards')).toBe(4)
  })
  it('needs a session and a valid option; anon cannot call it', async () => {
    await fails(asAnon(db, () => q('select public.delete_my_account($1,$2)', [PW, 'transfer'])))
    await fails(del(U.leaver, PW, 'everything'))
    await fails(del(U.leaver, PW, null))
    expect(await count('select count(*)::int n from auth.users where id=$1', [U.leaver.id])).toBe(1)
  })

  it("'transfer': solo boards vanish, shared boards go to the best successor, others are untouched", async () => {
    await del(U.leaver, PW, 'transfer')
    expect(await count('select count(*)::int n from auth.users where id=$1', [U.leaver.id])).toBe(0)
    expect(await count('select count(*)::int n from public.boards where id=$1', [soloBoard])).toBe(0)
    expect(await count('select count(*)::int n from public.cards c join public.columns col on col.id=c.column_id where col.board_id=$1', [soloBoard])).toBe(0)

    const shared = (await q('select created_by from public.boards where id=$1', [sharedBoard])).rows[0]
    expect(shared.created_by).toBe(U.editor.id)
    expect((await q('select created_by from public.boards where id=$1', [viewerOnlyBoard])).rows[0].created_by).toBe(U.viewer.id)
    // مالک جدید دیگر «عضو» نیست (مالک ضمنی است) و بقیه‌ی اعضا مانده‌اند
    expect((await q('select user_id from public.board_members where board_id=$1', [sharedBoard])).rows.map((r) => r.user_id)).toEqual([U.viewer.id])
    expect(await count('select count(*)::int n from public.board_members where board_id=$1', [viewerOnlyBoard])).toBe(0)
    // محتوای بورد منتقل‌شده سالم است و مالک جدید واقعاً مالک است
    await as(U.editor, async () => {
      expect(await count('select count(*)::int n from public.cards where board_id=$1', [sharedBoard])).toBe(1)
      await q(`update public.boards set title='renamed' where id=$1`, [sharedBoard])
      expect((await q('select title from public.boards where id=$1', [sharedBoard])).rows[0].title).toBe('renamed')
    })
    // بوردِ شخص دیگر دست‌نخورده، و عضویتِ leaver در آن پاک شده
    expect(await count('select count(*)::int n from public.boards where id=$1', [otherBoard])).toBe(1)
    expect(await count('select count(*)::int n from public.board_members where user_id=$1', [U.leaver.id])).toBe(0)
    expect(await count('select count(*)::int n from public.cards c join public.columns col on col.id=c.column_id where col.board_id=$1', [otherBoard])).toBe(1)
  })

  it("'delete': shared boards disappear for everyone too", async () => {
    await del(U.leaver, PW, 'delete')
    expect(await count('select count(*)::int n from public.boards where id = any($1)', [[soloBoard, sharedBoard, viewerOnlyBoard]])).toBe(0)
    expect(await count('select count(*)::int n from public.board_members where board_id = any($1)', [[sharedBoard, viewerOnlyBoard]])).toBe(0)
    for (const u of [U.editor, U.viewer]) expect((await as(u, () => q('select count(*)::int n from public.boards'))).rows[0].n).toBe(0)
    expect(await count('select count(*)::int n from public.boards where id=$1', [otherBoard])).toBe(1)
  })

  it('cleans up invites: those sent to the leaver go away, their address is erased from others', async () => {
    await as(U.other, () => q('select public.invite_to_board($1,$2,$3)', [otherBoard, U.leaver.email, 'viewer'])).catch(() => {}) // leaver از قبل عضو است ⇒ رد می‌شود
    await q(`insert into public.board_invites (board_id,email,role,board_title,invited_by_email) values ($1,$2,'viewer','t',$3)`, [otherBoard, 'x@y.co', U.leaver.email])
    await q(`insert into public.board_invites (board_id,email,role,board_title) values ($1,$2,'viewer','t')`, [otherBoard, U.leaver.email])
    await del(U.leaver)
    expect(await count('select count(*)::int n from public.board_invites where email=$1', [U.leaver.email])).toBe(0)
    expect(await count('select count(*)::int n from public.board_invites where lower(invited_by_email)=$1', [U.leaver.email])).toBe(0)
    expect(await count('select count(*)::int n from public.board_invites where email=$1', ['x@y.co'])).toBe(1) // خودِ دعوت می‌ماند
    expect(await count('select count(*)::int n from public.board_invites where email=$1', ['pending-to-leaver@x.com'])).toBe(1)
  })

  it('a deleted user can sign up again and starts clean', async () => {
    await del(U.leaver)
    await q(`insert into auth.users (id,email,email_confirmed_at,encrypted_password) values ($1,$2,now(),'x')`, [ID(9), U.leaver.email])
    expect((await as({ id: ID(9), email: U.leaver.email }, () => q('select count(*)::int n from public.boards'))).rows[0].n).toBe(0)
  })

  it('only removes the caller; the one legitimate side effect is inheritance of boards they shared', async () => {
    await del(U.other)
    expect(await count('select count(*)::int n from auth.users where id=$1', [U.leaver.id])).toBe(1)
    // leaver بود ویرایشگرِ بوردِ other، پس وارث آن می‌شود (۳ بوردِ خودش + ۱)
    expect((await q('select created_by from public.boards where id=$1', [otherBoard])).rows[0].created_by).toBe(U.leaver.id)
    expect(await count('select count(*)::int n from public.boards where created_by=$1', [U.leaver.id])).toBe(4)
    // و هیچ بوردِ دیگری از leaver دست نخورده (همچنان ۳ بورد قبلی‌اش با همان محتوا)
    expect(await count('select count(*)::int n from public.boards where id = any($1)', [[soloBoard, sharedBoard, viewerOnlyBoard]])).toBe(3)
  })
})
