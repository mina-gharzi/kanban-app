-- ============================================================================
-- اشتراک‌گذاری بورد: مالک + اعضا (editor / viewer) با دعوت‌نامه
--
-- مدل:
--   • مالک همان boards.created_by است (ضمنی؛ در board_members نمی‌آید).
--   • board_members: عضوهای غیرمالک با نقش editor (خواندن/نوشتن ستون و کارت)
--     یا viewer (فقط خواندن). فقط مالک بورد را تغییر نام می‌دهد/حذف می‌کند و
--     اعضا را مدیریت می‌کند.
--   • board_invites: دعوت با ایمیل. عمداً «معلق» می‌ماند و فقط خودِ دعوت‌شده
--     با ایمیلِ تأییدشده‌اش می‌پذیرد؛ پس دعوت‌کننده از پاسخ سیستم نمی‌فهمد
--     که آن ایمیل حساب دارد یا نه (بدون enumeration) و ایمیل ساختگیِ یک
--     حساب تأییدنشده هم دعوت‌ها را نمی‌گیرد.
--
-- امنیت: همه‌ی دسترسی‌ها با RLS است. توابع کمکی SECURITY DEFINER فقط
-- boolean درباره‌ی «کاربرِ جاری» برمی‌گردانند (برای شکستن چرخه‌ی RLS بین
-- boards و board_members لازم‌اند). نوشتن در board_members/board_invites
-- فقط از راه RPCها ممکن است.
-- ============================================================================

-- ─── ۱) جدول‌ها ────────────────────────────────────────────────────────────
create table if not exists public.board_members (
  board_id   uuid not null references public.boards(id) on delete cascade,
  user_id    uuid not null references auth.users(id)    on delete cascade,
  role       text not null check (role in ('editor', 'viewer')),
  email      text not null,              -- snapshot هنگام پذیرش؛ برای نمایش فهرست اعضا
  created_at timestamptz not null default now(),
  primary key (board_id, user_id)
);
create index if not exists board_members_user_idx on public.board_members (user_id);

create table if not exists public.board_invites (
  id               uuid primary key default gen_random_uuid(),
  board_id         uuid not null references public.boards(id) on delete cascade,
  email            text not null check (email = lower(email) and char_length(email) between 3 and 254),
  role             text not null check (role in ('editor', 'viewer')),
  board_title      text not null,        -- snapshot: دعوت‌شده هنوز اجازه‌ی خواندن بورد را ندارد
  invited_by_email text,
  created_at       timestamptz not null default now(),
  unique (board_id, email)
);
create index if not exists board_invites_email_idx on public.board_invites (email);

alter table public.board_members enable row level security;
alter table public.board_invites enable row level security;

-- ─── ۲) توابع کمکی (SECURITY DEFINER، فقط درباره‌ی کاربر جاری) ─────────────
create or replace function public.is_board_owner(p_board_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.boards b
     where b.id = p_board_id and b.created_by = (select auth.uid())
  )
$$;

create or replace function public.is_board_member(p_board_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_board_owner(p_board_id)
      or exists (
           select 1 from public.board_members m
            where m.board_id = p_board_id and m.user_id = (select auth.uid())
         )
$$;

create or replace function public.can_edit_board(p_board_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.is_board_owner(p_board_id)
      or exists (
           select 1 from public.board_members m
            where m.board_id = p_board_id
              and m.user_id = (select auth.uid())
              and m.role = 'editor'
         )
$$;

-- ایمیلِ تأییدشده‌ی کاربر جاری (یا null). دعوت فقط به ایمیل تأییدشده تحویل می‌شود.
create or replace function public.my_confirmed_email()
returns text language sql stable security definer set search_path = ''
as $$
  select lower(u.email) from auth.users u
   where u.id = (select auth.uid()) and u.email_confirmed_at is not null
$$;

-- ─── ۳) policyها ───────────────────────────────────────────────────────────
-- boards: خواندن برای مالک و اعضا؛ نوشتن فقط مالک.
-- شرط `created_by = uid` مستقیم هم آمده، چون INSERT ... RETURNING سطرِ تازه را
-- با تابع STABLE نمی‌بیند (snapshot همان دستور).
drop policy if exists "Users manage own boards" on public.boards;
drop policy if exists boards_select on public.boards;
drop policy if exists boards_insert on public.boards;
drop policy if exists boards_update on public.boards;
drop policy if exists boards_delete on public.boards;
create policy boards_select on public.boards for select to authenticated
  using (created_by = (select auth.uid()) or public.is_board_member(id));
create policy boards_insert on public.boards for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy boards_update on public.boards for update to authenticated
  using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()));
create policy boards_delete on public.boards for delete to authenticated
  using (created_by = (select auth.uid()));

-- columns و cards: خواندن برای اعضا، نوشتن برای مالک و editor
drop policy if exists "Users manage columns of own boards" on public.columns;
drop policy if exists columns_select on public.columns;
drop policy if exists columns_insert on public.columns;
drop policy if exists columns_update on public.columns;
drop policy if exists columns_delete on public.columns;
create policy columns_select on public.columns for select to authenticated
  using (public.is_board_member(board_id));
create policy columns_insert on public.columns for insert to authenticated
  with check (public.can_edit_board(board_id));
create policy columns_update on public.columns for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy columns_delete on public.columns for delete to authenticated
  using (public.can_edit_board(board_id));

-- cards.board_id را trigger از روی ستون می‌سازد (قبل از بررسی WITH CHECK)؛ پس
-- انتقال کارت به ستونِ بوردِ دیگر هم باید روی هر دو بورد اجازه‌ی نوشتن داشته باشد.
drop policy if exists "Users manage cards of own boards" on public.cards;
drop policy if exists cards_select on public.cards;
drop policy if exists cards_insert on public.cards;
drop policy if exists cards_update on public.cards;
drop policy if exists cards_delete on public.cards;
create policy cards_select on public.cards for select to authenticated
  using (public.is_board_member(board_id));
create policy cards_insert on public.cards for insert to authenticated
  with check (public.can_edit_board(board_id));
create policy cards_update on public.cards for update to authenticated
  using (public.can_edit_board(board_id)) with check (public.can_edit_board(board_id));
create policy cards_delete on public.cards for delete to authenticated
  using (public.can_edit_board(board_id));

-- board_members: اعضا همدیگر را می‌بینند؛ فقط مالک نقش را عوض می‌کند و حذف
-- می‌کند؛ هر عضو می‌تواند خودش را حذف کند (ترک بورد). INSERT فقط با RPC.
drop policy if exists board_members_select on public.board_members;
drop policy if exists board_members_update on public.board_members;
drop policy if exists board_members_delete on public.board_members;
create policy board_members_select on public.board_members for select to authenticated
  using (public.is_board_member(board_id));
create policy board_members_update on public.board_members for update to authenticated
  using (public.is_board_owner(board_id)) with check (public.is_board_owner(board_id));
create policy board_members_delete on public.board_members for delete to authenticated
  using (public.is_board_owner(board_id) or user_id = (select auth.uid()));

-- board_invites: مالک بورد و خودِ دعوت‌شده (با ایمیل تأییدشده) می‌بینند و حذف
-- می‌کنند (لغو / رد). ساخت و پذیرش فقط با RPC.
drop policy if exists board_invites_select on public.board_invites;
drop policy if exists board_invites_delete on public.board_invites;
create policy board_invites_select on public.board_invites for select to authenticated
  using (public.is_board_owner(board_id) or email = public.my_confirmed_email());
create policy board_invites_delete on public.board_invites for delete to authenticated
  using (public.is_board_owner(board_id) or email = public.my_confirmed_email());

-- سطح جدول: بدون INSERT مستقیم؛ از board_members فقط ستون role قابل UPDATE است
revoke all on public.board_members, public.board_invites from anon, authenticated;
grant select, delete on public.board_members, public.board_invites to authenticated;
grant update (role) on public.board_members to authenticated;

-- ─── ۴) RPCهای دعوت ────────────────────────────────────────────────────────
create or replace function public.invite_to_board(p_board_id uuid, p_email text, p_role text)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  v_email   text := lower(btrim(coalesce(p_email, '')));
  v_title   text;
  v_inviter text;
begin
  if (select auth.uid()) is null then
    raise exception 'invite_to_board: not authenticated' using errcode = '28000';
  end if;
  if not public.is_board_owner(p_board_id) then
    raise exception 'invite_to_board: only the board owner can invite' using errcode = '42501';
  end if;
  if p_role is null or p_role not in ('editor', 'viewer') then
    raise exception 'invite_to_board: invalid role' using errcode = '22023';
  end if;
  if char_length(v_email) not between 3 and 254 or v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invite_to_board: invalid email' using errcode = '22023';
  end if;

  select b.title into v_title from public.boards b where b.id = p_board_id;
  select lower(u.email) into v_inviter from auth.users u where u.id = (select auth.uid());

  if v_email = v_inviter then
    raise exception 'invite_to_board: you are the owner' using errcode = '22023';
  end if;
  if exists (select 1 from public.board_members m
              where m.board_id = p_board_id and lower(m.email) = v_email) then
    raise exception 'invite_to_board: already a member' using errcode = '23505';
  end if;
  -- سقف دعوت‌های معلق (جلوگیری از سوءاستفاده)
  if (select count(*) from public.board_invites i where i.board_id = p_board_id) >= 50
     and not exists (select 1 from public.board_invites i
                      where i.board_id = p_board_id and i.email = v_email) then
    raise exception 'invite_to_board: too many pending invites' using errcode = '54000';
  end if;

  insert into public.board_invites (board_id, email, role, board_title, invited_by_email)
  values (p_board_id, v_email, p_role, v_title, v_inviter)
  on conflict (board_id, email)
  do update set role = excluded.role, board_title = excluded.board_title;
end;
$$;

create or replace function public.accept_board_invite(p_invite_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare
  v_email text := public.my_confirmed_email();
  v_inv   public.board_invites%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'accept_board_invite: not authenticated' using errcode = '28000';
  end if;
  if v_email is null then
    raise exception 'accept_board_invite: confirm your email first' using errcode = '42501';
  end if;

  select * into v_inv from public.board_invites i
   where i.id = p_invite_id and i.email = v_email
   for update;
  if not found then
    raise exception 'accept_board_invite: invite not found' using errcode = 'P0002';
  end if;

  insert into public.board_members (board_id, user_id, role, email)
  values (v_inv.board_id, (select auth.uid()), v_inv.role, v_email)
  on conflict (board_id, user_id) do update set role = excluded.role;

  delete from public.board_invites where id = v_inv.id;
  return v_inv.board_id;
end;
$$;

-- ─── ۵) RPCهای جابه‌جایی: «مالک» → «کسی که می‌تواند ویرایش کند» ─────────────

create or replace function public.move_cards(p_moves jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_position_type text;
  v_expected      integer;
  v_valid         integer;
begin
  if p_moves is null or jsonb_typeof(p_moves) is distinct from 'array' then
    raise exception 'move_cards: p_moves must be a jsonb array'
      using errcode = '22023';
  end if;

  v_expected := jsonb_array_length(p_moves);
  -- جابه‌جایی بدون سطر، کاری برای انجام دادن نیست (و همان بررسیِ کلاینت).
  if v_expected = 0 then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'move_cards: authentication required'
      using errcode = '42501';
  end if;

  select count(distinct m.move ->> 'id')
    into v_valid
    from jsonb_array_elements(p_moves) as m(move);

  if v_valid <> v_expected then
    raise exception 'move_cards: p_moves contains duplicate card ids'
      using errcode = '22023';
  end if;

  select format_type(att.atttypid, att.atttypmod)
    into v_position_type
    from pg_attribute att
   where att.attrelid = 'public.cards'::regclass
     and att.attname  = 'position'
     and not att.attisdropped;

  if v_position_type is null then
    raise exception 'move_cards: cards.position not found';
  end if;

  -- هر سطرِ ورودی باید هم‌زمان این سه شرط را داشته باشد:
  --   ۱) کارت وجود دارد و متعلق به بوردی است که کاربر جاری اجازه‌ی ویرایش آن را دارد (مالک یا editor)
  --   ۲) ستون مقصد وجود دارد و متعلق به *همان* بوردِ کارت است
  --   ۳) مقادیر درست‌شکل‌اند (uuid معتبر و position عددی)
  -- تطبیقِ regex عمدی است: اگر به cast صریح تکیه کنیم، ورودیِ نامعتبر به
  -- خطای داخلی Postgres می‌خورد و پیامش به کاربر چیزی درباره‌ی داده نمی‌گوید.
  select count(*) into v_valid
    from jsonb_array_elements(p_moves) as m(move)
   where (m.move ->> 'id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
     and (m.move ->> 'column_id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      and jsonb_typeof(m.move -> 'position') = 'number'
      and exists (
        select 1
          from public.cards   c
          join public.columns src on src.id = c.column_id
          join public.columns dst on dst.id = (m.move ->> 'column_id')::uuid
          join public.boards  b  on b.id  = src.board_id
         where c.id         = (m.move ->> 'id')::uuid
           and dst.board_id = src.board_id
           and public.can_edit_board(b.id)
      );

  if v_valid <> v_expected then
    raise exception 'move_cards: % of % moves rejected (card not editable by you, or source and destination are not on the same board)',
      v_expected - v_valid, v_expected
      using errcode = '42501';
  end if;

  -- همه‌ی سطرها اعتبارسنجی شدند؛ حالا UPDATE خالص. اگر cast یا FK خطا بدهد،
  -- کل تابع در یک تراکنش است و تراکنش برگشت می‌خورد: یا همه جابه‌جا می‌شوند
  -- یا هیچ‌کدام.
  --
  -- نکته‌ی مهم درباره‌ی `execute`: متن SQL ساخته‌شده، یک رشته‌ی مستقل است و PL/pgSQL
  -- داخل آن متغیرها را جای‌گذاری نمی‌کند. پس نوشتن `p_moves` در آن متن به «ستون
  -- ناشناخته» تبدیل می‌شود و در اولین اجرا می‌ترکد. راه درست، تزریق مقدار به‌عنوان
  -- literal با `%L` است که خودش quote می‌کند و جلوی تزریق SQL را هم می‌گیرد.
  execute format(
    $sql$
      update public.cards as c
         set column_id = (m.move ->> 'column_id')::uuid,
             position   = (m.move ->> 'position')::%s
        from jsonb_array_elements(%L::jsonb) as m(move)
       where c.id = (m.move ->> 'id')::uuid
    $sql$,
    v_position_type,
    p_moves
  );
end;
$$;

create or replace function public.move_columns(p_moves jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_position_type text;
  v_expected      integer;
  v_valid         integer;
begin
  if p_moves is null or jsonb_typeof(p_moves) is distinct from 'array' then
    raise exception 'move_columns: p_moves must be a jsonb array'
      using errcode = '22023';
  end if;

  v_expected := jsonb_array_length(p_moves);
  if v_expected = 0 then
    return;
  end if;

  if auth.uid() is null then
    raise exception 'move_columns: authentication required'
      using errcode = '42501';
  end if;

  select count(distinct m.move ->> 'id')
    into v_valid
    from jsonb_array_elements(p_moves) as m(move);

  if v_valid <> v_expected then
    raise exception 'move_columns: p_moves contains duplicate column ids'
      using errcode = '22023';
  end if;

  select format_type(att.atttypid, att.atttypmod)
    into v_position_type
    from pg_attribute att
   where att.attrelid = 'public.columns'::regclass
     and att.attname  = 'position'
     and not att.attisdropped;

  if v_position_type is null then
    raise exception 'move_columns: columns.position not found';
  end if;

  select count(*) into v_valid
    from jsonb_array_elements(p_moves) as m(move)
   where (m.move ->> 'id') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      and jsonb_typeof(m.move -> 'position') = 'number'
      and exists (
        select 1
          from public.columns c
          join public.boards b on b.id = c.board_id
         where c.id         = (m.move ->> 'id')::uuid
           and public.can_edit_board(b.id)
      );

  if v_valid <> v_expected then
    raise exception 'move_columns: % of % moves rejected (column not editable by you)',
      v_expected - v_valid, v_expected
      using errcode = '42501';
  end if;

  -- همه‌ی ستون‌های ورودی باید متعلق به یک بورد باشند. شمارشِ بوردهای متمایز
  -- در برابر تعداد سطرها، همین را می‌سنجد و نیازی به گروه‌بندی نیست.
  select count(distinct c.board_id) into v_valid
    from public.columns c
   where c.id in (
     select (m.move ->> 'id')::uuid
       from jsonb_array_elements(p_moves) as m(move)
   );

  if v_valid <> 1 then
    raise exception 'move_columns: all columns must belong to the same board'
      using errcode = '42501';
  end if;

  execute format(
    $sql$
      update public.columns as c
         set position = (m.move ->> 'position')::%s
        from jsonb_array_elements(%L::jsonb) as m(move)
       where c.id = (m.move ->> 'id')::uuid
    $sql$,
    v_position_type,
    p_moves
  );
end;
$$;

-- ─── ۶) دسترسی توابع ───────────────────────────────────────────────────────
revoke all on function public.is_board_owner(uuid), public.is_board_member(uuid),
  public.can_edit_board(uuid), public.my_confirmed_email(),
  public.invite_to_board(uuid, text, text), public.accept_board_invite(uuid)
  from public, anon;
grant execute on function public.is_board_owner(uuid), public.is_board_member(uuid),
  public.can_edit_board(uuid), public.my_confirmed_email(),
  public.invite_to_board(uuid, text, text), public.accept_board_invite(uuid)
  to authenticated;
