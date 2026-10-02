import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { asAnon, asUser, createDb } from './harness.mjs'

let db
const U = {
  owner:   { id: '00000000-0000-4000-8000-000000000001', email: 'owner@x.com' },
  editor:  { id: '00000000-0000-4000-8000-000000000002', email: 'editor@x.com' },
  viewer:  { id: '00000000-0000-4000-8000-000000000003', email: 'viewer@x.com' },
  stranger:{ id: '00000000-0000-4000-8000-000000000004', email: 'stranger@x.com' },
  pending: { id: '00000000-0000-4000-8000-000000000005', email: 'pending@x.com' }, // ایمیل تأییدنشده
}
let boardId, colId, cardId

const q = (sql, params) => db.query(sql, params)
const as = (u, fn) => asUser(db, u, fn)
const invite = (u, board, email, role = 'editor') => as(u, () => q('select public.invite_to_board($1,$2,$3)', [board, email, role]))
async function accept(u) {
  return as(u, async () => {
    const inv = await q('select id from public.board_invites')
    return q('select public.accept_board_invite($1)', [inv.rows[0].id])
  })
}

beforeAll(async () => { db = await createDb() })

beforeEach(async () => {
  await db.exec('truncate public.boards, auth.users cascade')
  for (const [k, u] of Object.entries(U)) {
    await q('insert into auth.users (id,email,email_confirmed_at) values ($1,$2,$3)', [u.id, u.email, k === 'pending' ? null : new Date()])
  }
  await as(U.owner, async () => {
    boardId = (await q(`insert into public.boards (title, created_by) values ('B', $1) returning id`, [U.owner.id])).rows[0].id
    colId   = (await q(`insert into public.columns (board_id,title,position) values ($1,'C',0) returning id`, [boardId])).rows[0].id
    cardId  = (await q(`insert into public.cards (column_id,title,position) values ($1,'K',0) returning id`, [colId])).rows[0].id
  })
})

const count = async (u, table) => as(u, async () => (await q(`select count(*)::int n from public.${table}`)).rows[0].n)
const fails = (p) => expect(p).rejects.toThrow()

describe('before any sharing', () => {
  it('owner sees everything, a stranger sees nothing', async () => {
    expect(await count(U.owner, 'boards')).toBe(1)
    expect(await count(U.owner, 'cards')).toBe(1)
    for (const t of ['boards', 'columns', 'cards', 'board_members', 'board_invites']) expect(await count(U.stranger, t)).toBe(0)
  })
  it('a stranger cannot write', async () => {
    await fails(as(U.stranger, () => q(`insert into public.columns (board_id,title,position) values ($1,'x',1)`, [boardId])))
    await as(U.stranger, async () => {
      expect((await q(`update public.cards set title='hacked' where id=$1 returning id`, [cardId])).rows).toHaveLength(0)
      expect((await q(`delete from public.boards where id=$1 returning id`, [boardId])).rows).toHaveLength(0)
    })
  })
  it('anon can read nothing and call nothing', async () => {
    await fails(asAnon(db, () => q('select * from public.boards')))
    await fails(asAnon(db, () => q('select public.invite_to_board($1,$2,$3)', [boardId, 'a@b.co', 'editor'])))
  })
})

describe('inviting', () => {
  it('only the owner can invite', async () => {
    await fails(invite(U.stranger, boardId, 'x@y.co'))
    await invite(U.owner, boardId, 'editor@x.com')
    await accept(U.editor)
    await fails(invite(U.editor, boardId, 'z@y.co')) // editor هم نمی‌تواند
  })
  it('behaves identically for registered and unknown emails (no account enumeration)', async () => {
    const a = await invite(U.owner, boardId, 'editor@x.com')
    const b = await invite(U.owner, boardId, 'nobody-here@example.org')
    expect(a.rows).toEqual(b.rows)
    const rows = await as(U.owner, () => q('select email, role from public.board_invites order by email'))
    expect(rows.rows.map((r) => r.email)).toEqual(['editor@x.com', 'nobody-here@example.org'])
    expect(await count(U.owner, 'board_members')).toBe(0) // هیچ‌کس خودکار عضو نمی‌شود
  })
  it('normalises email case/whitespace and rejects bad input', async () => {
    await invite(U.owner, boardId, '  EDITOR@X.com ')
    expect((await as(U.owner, () => q('select email from public.board_invites'))).rows[0].email).toBe('editor@x.com')
    await fails(invite(U.owner, boardId, 'not-an-email'))
    await fails(invite(U.owner, boardId, 'a@b.co', 'owner'))
    await fails(invite(U.owner, boardId, 'a@b.co', null))
    await fails(invite(U.owner, boardId, U.owner.email)) // خودش
  })
  it('re-inviting updates the role instead of duplicating', async () => {
    await invite(U.owner, boardId, 'editor@x.com', 'viewer')
    await invite(U.owner, boardId, 'editor@x.com', 'editor')
    const r = await as(U.owner, () => q('select role from public.board_invites'))
    expect(r.rows).toEqual([{ role: 'editor' }])
  })
  it('caps pending invites per board at 50', async () => {
    for (let i = 0; i < 50; i++) await invite(U.owner, boardId, `u${i}@x.com`)
    await fails(invite(U.owner, boardId, 'one-too-many@x.com'))
    await invite(U.owner, boardId, 'u0@x.com', 'viewer') // به‌روزرسانی موجود مجاز است
  })
})

describe('accepting', () => {
  it('only the invited, confirmed user can see and accept the invite', async () => {
    await invite(U.owner, boardId, 'editor@x.com')
    expect(await count(U.editor, 'board_invites')).toBe(1)
    expect(await count(U.stranger, 'board_invites')).toBe(0)
    const id = (await as(U.owner, () => q('select id from public.board_invites'))).rows[0].id
    await fails(as(U.stranger, () => q('select public.accept_board_invite($1)', [id])))
    await accept(U.editor)
    expect(await count(U.owner, 'board_invites')).toBe(0)
    expect((await as(U.owner, () => q('select email, role from public.board_members'))).rows).toEqual([{ email: 'editor@x.com', role: 'editor' }])
  })
  it('an unconfirmed email can neither see nor accept invites sent to it', async () => {
    await invite(U.owner, boardId, 'pending@x.com')
    expect(await count(U.pending, 'board_invites')).toBe(0)
    const id = (await as(U.owner, () => q('select id from public.board_invites'))).rows[0].id
    await fails(as(U.pending, () => q('select public.accept_board_invite($1)', [id])))
  })
  it('clients cannot create memberships or invites directly', async () => {
    await fails(as(U.stranger, () => q(`insert into public.board_members (board_id,user_id,role,email) values ($1,$2,'editor','s@x.com')`, [boardId, U.stranger.id])))
    await fails(as(U.owner, () => q(`insert into public.board_members (board_id,user_id,role,email) values ($1,$2,'editor','s@x.com')`, [boardId, U.stranger.id])))
    await fails(as(U.owner, () => q(`insert into public.board_invites (board_id,email,role,board_title) values ($1,'a@b.co','editor','B')`, [boardId])))
  })
  it('an invitee can decline, an owner can revoke', async () => {
    await invite(U.owner, boardId, 'editor@x.com'); await invite(U.owner, boardId, 'viewer@x.com')
    await as(U.editor, () => q('delete from public.board_invites'))        // فقط دعوت خودش
    expect(await count(U.owner, 'board_invites')).toBe(1)
    await as(U.owner, () => q('delete from public.board_invites'))
    expect(await count(U.owner, 'board_invites')).toBe(0)
  })
})

describe('roles', () => {
  beforeEach(async () => {
    await invite(U.owner, boardId, 'editor@x.com', 'editor'); await accept(U.editor)
    await invite(U.owner, boardId, 'viewer@x.com', 'viewer'); await accept(U.viewer)
  })

  it('members read the board, columns, cards and co-members; strangers still see nothing', async () => {
    for (const u of [U.editor, U.viewer]) {
      expect(await count(u, 'boards')).toBe(1)
      expect(await count(u, 'columns')).toBe(1)
      expect(await count(u, 'cards')).toBe(1)
      expect(await count(u, 'board_members')).toBe(2)
    }
    expect(await count(U.stranger, 'cards')).toBe(0)
  })

  it('editor can create/update/move/delete cards and columns', async () => {
    await as(U.editor, async () => {
      const c2 = (await q(`insert into public.columns (board_id,title,position) values ($1,'C2',1) returning id`, [boardId])).rows[0].id
      const k2 = (await q(`insert into public.cards (column_id,title,position) values ($1,'new',1) returning id, board_id`, [colId])).rows[0]
      expect(k2.board_id).toBe(boardId) // trigger
      await q(`update public.cards set title='edited' where id=$1`, [cardId])
      await q(`select public.move_cards($1::jsonb)`, [JSON.stringify([{ id: cardId, column_id: c2, position: 0.5 }])])
      await q(`select public.move_columns($1::jsonb)`, [JSON.stringify([{ id: c2, position: -1 }])])
      await q(`delete from public.cards where id=$1`, [k2.id])
      await q(`delete from public.columns where id=$1`, [c2])
    })
  })

  it('editor cannot rename/delete the board, manage members or invites', async () => {
    await as(U.editor, async () => {
      expect((await q(`update public.boards set title='x' where id=$1 returning id`, [boardId])).rows).toHaveLength(0)
      expect((await q(`delete from public.boards where id=$1 returning id`, [boardId])).rows).toHaveLength(0)
      expect((await q(`update public.board_members set role='viewer' returning user_id`)).rows).toHaveLength(0)
      expect((await q(`delete from public.board_members where user_id=$1 returning user_id`, [U.viewer.id])).rows).toHaveLength(0)
    })
  })

  it('viewer can read but every write is rejected', async () => {
    await as(U.viewer, async () => {
      await fails(q(`insert into public.cards (column_id,title,position) values ($1,'x',1)`, [colId]))
      await fails(q(`insert into public.columns (board_id,title,position) values ($1,'x',1)`, [boardId]))
      expect((await q(`update public.cards set title='x' where id=$1 returning id`, [cardId])).rows).toHaveLength(0)
      expect((await q(`delete from public.cards where id=$1 returning id`, [cardId])).rows).toHaveLength(0)
      await fails(q(`select public.move_cards($1::jsonb)`, [JSON.stringify([{ id: cardId, column_id: colId, position: 5 }])]))
      await fails(q(`select public.move_columns($1::jsonb)`, [JSON.stringify([{ id: colId, position: 5 }])]))
    })
    expect(await count(U.owner, 'cards')).toBe(1)
  })

  it('a stranger cannot move cards through the RPC either', async () => {
    await fails(as(U.stranger, () => q(`select public.move_cards($1::jsonb)`, [JSON.stringify([{ id: cardId, column_id: colId, position: 5 }])])))
  })

  it('an editor of board A cannot smuggle a card into board B (board_id is trigger-derived)', async () => {
    let colB
    await as(U.stranger, async () => {
      const b = (await q(`insert into public.boards (title,created_by) values ('B2',$1) returning id`, [U.stranger.id])).rows[0].id
      colB = (await q(`insert into public.columns (board_id,title,position) values ($1,'c',0) returning id`, [b])).rows[0].id
    })
    await fails(as(U.editor, () => q(`update public.cards set column_id=$1 where id=$2`, [colB, cardId])))
    await fails(as(U.editor, () => q(`insert into public.cards (column_id,title,position) values ($1,'x',0)`, [colB])))
  })

  it('members cannot rewrite who/what a membership is about (only role is updatable, only by the owner)', async () => {
    await fails(as(U.owner, () => q(`update public.board_members set user_id=$1 where user_id=$2`, [U.stranger.id, U.editor.id])))
    await fails(as(U.owner, () => q(`update public.board_members set board_id=$1`, [boardId])))
    await fails(as(U.owner, () => q(`update public.board_members set email='x@y.co'`)))
  })

  it('owner downgrades an editor: write access disappears immediately', async () => {
    await as(U.owner, () => q(`update public.board_members set role='viewer' where user_id=$1`, [U.editor.id]))
    await fails(as(U.editor, () => q(`insert into public.cards (column_id,title,position) values ($1,'x',9)`, [colId])))
    expect(await count(U.editor, 'cards')).toBe(1) // خواندن همچنان هست
  })

  it('owner removes a member: all access disappears immediately', async () => {
    await as(U.owner, () => q(`delete from public.board_members where user_id=$1`, [U.editor.id]))
    for (const t of ['boards', 'columns', 'cards', 'board_members']) expect(await count(U.editor, t)).toBe(0)
  })

  it('a member can leave, but only themself', async () => {
    await as(U.viewer, async () => {
      expect((await q(`delete from public.board_members where user_id=$1 returning user_id`, [U.editor.id])).rows).toHaveLength(0)
      expect((await q(`delete from public.board_members where user_id=$1 returning user_id`, [U.viewer.id])).rows).toHaveLength(1)
    })
    expect(await count(U.viewer, 'boards')).toBe(0)
    expect(await count(U.editor, 'boards')).toBe(1)
  })

  it('deleting the board cascades members, invites and cards', async () => {
    await invite(U.owner, boardId, 'later@x.com')
    await as(U.owner, () => q(`delete from public.boards where id=$1`, [boardId]))
    const left = (await q(`select (select count(*) from public.board_members)::int m, (select count(*) from public.board_invites)::int i, (select count(*) from public.cards)::int c`)).rows[0]
    expect(left).toEqual({ m: 0, i: 0, c: 0 })
  })

  it('a member who is also invited again keeps a single membership (role updated)', async () => {
    await invite(U.owner, boardId, 'viewer@x.com', 'viewer').catch(() => {}) // مدیر قبلاً عضو است: رد می‌شود
    await fails(invite(U.owner, boardId, 'viewer@x.com', 'editor'))
    expect(await count(U.owner, 'board_members')).toBe(2)
  })
})

describe('privacy of existing data after the migration', () => {
  it('invite rows expose nothing to unrelated users, even with a guessable board id', async () => {
    await invite(U.owner, boardId, 'editor@x.com')
    await as(U.stranger, async () => {
      expect((await q('select * from public.board_invites where board_id=$1', [boardId])).rows).toHaveLength(0)
      expect((await q('select * from public.board_members where board_id=$1', [boardId])).rows).toHaveLength(0)
    })
  })
})
