// Test harness: a real Postgres (PGlite/WASM) with a minimal Supabase stub
// (auth schema, roles, publication) and the baseline schema as seen in production.
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const MIGRATIONS_DIR = path.join(root, 'supabase/migrations')

const STUB = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
create schema auth;
create table auth.users (id uuid primary key default gen_random_uuid(), email text unique, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true), 'email', current_setting('request.jwt.claim.email', true)) $$;
grant usage on schema auth to anon, authenticated;
grant execute on function auth.uid(), auth.jwt() to anon, authenticated;
create publication supabase_realtime;
grant usage on schema public to anon, authenticated, service_role;

create table public.boards  (id uuid primary key default gen_random_uuid(), title text not null, created_at timestamp default now(), created_by uuid references auth.users(id));
create table public.columns (id uuid primary key default gen_random_uuid(), board_id uuid references public.boards(id) on delete cascade, title text not null, position int4 not null);
create table public.cards   (id uuid primary key default gen_random_uuid(), column_id uuid references public.columns(id) on delete cascade, title text not null, description text, position int4 not null, created_at timestamp default now(), label_color text, due_date date);
alter table public.boards enable row level security; alter table public.columns enable row level security; alter table public.cards enable row level security;
create policy "Users manage own boards" on public.boards for all to public using (auth.uid() = created_by) with check (auth.uid() = created_by);
create policy "Users manage columns of own boards" on public.columns for all to public
  using (exists (select 1 from boards where boards.id = columns.board_id and boards.created_by = auth.uid()))
  with check (exists (select 1 from boards where boards.id = columns.board_id and boards.created_by = auth.uid()));
create policy "Users manage cards of own boards" on public.cards for all to public
  using (exists (select 1 from columns join boards on boards.id = columns.board_id where columns.id = cards.column_id and boards.created_by = auth.uid()))
  with check (exists (select 1 from columns join boards on boards.id = columns.board_id where columns.id = cards.column_id and boards.created_by = auth.uid()));
grant all on all tables in schema public to anon, authenticated, service_role;
`

export async function createDb({ upTo = '99999999999999' } = {}) {
  const db = new PGlite()
  await db.exec(STUB)
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  for (const f of files) {
    if (f.slice(0, 14) > upTo) break
    try { await db.exec(readFileSync(path.join(MIGRATIONS_DIR, f), 'utf8')) }
    catch (e) { throw new Error(`migration ${f} failed: ${e.message}`) }
  }
  return db
}

/** run `fn` as an authenticated user (RLS applies); always resets afterwards */
export async function asUser(db, user, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub','${user.id}',false), set_config('request.jwt.claim.email','${user.email}',false);`)
  try { return await fn() } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub','',false), set_config('request.jwt.claim.email','',false);`) }
}
export async function asAnon(db, fn) {
  await db.exec(`set role anon; select set_config('request.jwt.claim.sub','',false);`)
  try { return await fn() } finally { await db.exec(`reset role;`) }
}
