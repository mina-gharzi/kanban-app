-- ============================================================================
-- حذف حساب کاربری + پیش‌نمایش پیامدهایش
--
-- چرا RPC (و نه Admin API): حذف کاربر Auth به کلید service_role نیاز دارد که
-- هرگز نباید به مرورگر برسد. این تابع SECURITY DEFINER فقط «کاربر جاری» را حذف
-- می‌کند و با پیکربندی search_path = '' از ربودن نام‌ها (search_path hijack)
-- در امان است.
--
-- امنیت:
--   • رمز عبور دوباره در خودِ تابع با bcrypt سنجیده می‌شود (extensions.crypt روی
--     auth.users.encrypted_password)؛ نشستِ دزدیده‌شده یا XSS بدون رمز نمی‌تواند حساب
--     را پاک کند. رمز اشتباه ۱ ثانیه مکث می‌کند (کند کردن حدس‌زدن).
--   • فقط authenticated اجرا می‌کند.
--
-- بوردهای متعلق به کاربر:
--   • بدون عضو دیگر  → حذف می‌شود (ستون‌ها/کارت‌ها/دعوت‌ها cascade).
--   • با عضو دیگر + 'transfer' → مالکیت به قدیمی‌ترین «ویرایشگر» (در نبودِ
--     ویرایشگر، قدیمی‌ترین عضو) منتقل می‌شود؛ ردیف عضویتِ او حذف می‌شود چون مالک ضمنی است.
--   • با عضو دیگر + 'delete'   → برای همه حذف می‌شود.
-- عضویت کاربر در بوردهای دیگران با حذف auth.users (cascade) پاک می‌شود. دعوت‌های
-- ارسال‌شده به ایمیل او حذف و ایمیلش از «دعوت‌کننده‌ی» دعوت‌های دیگر پاک می‌شود.
-- ============================================================================

create or replace function public.account_deletion_preview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'account: not authenticated' using errcode = '28000';
  end if;

  return jsonb_build_object(
    'solo_boards', (
      select count(*) from public.boards b
       where b.created_by = v_uid
         and not exists (select 1 from public.board_members m where m.board_id = b.id)
    ),
    'shared_boards', coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'board_id', b.id,
                 'title', b.title,
                 'members', (select count(*) from public.board_members m where m.board_id = b.id),
                 'new_owner_email', (
                   select m.email from public.board_members m
                    where m.board_id = b.id
                    order by (m.role = 'editor') desc, m.created_at asc, m.user_id asc
                    limit 1
                 )
               ) order by b.created_at
             )
        from public.boards b
       where b.created_by = v_uid
         and exists (select 1 from public.board_members m where m.board_id = b.id)
    ), '[]'::jsonb),
    'memberships', (select count(*) from public.board_members m where m.user_id = v_uid)
  );
end;
$$;

create or replace function public.delete_my_account(p_password text, p_shared_boards text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_email     text;
  v_hash      text;
  v_board     record;
  v_new_owner uuid;
begin
  if v_uid is null then
    raise exception 'delete_my_account: not authenticated' using errcode = '28000';
  end if;
  if p_shared_boards is null or p_shared_boards not in ('transfer', 'delete') then
    raise exception 'delete_my_account: invalid shared_boards option' using errcode = '22023';
  end if;

  select lower(u.email), u.encrypted_password into v_email, v_hash
    from auth.users u where u.id = v_uid;
  if v_hash is null then
    raise exception 'delete_my_account: account has no password' using errcode = '42501';
  end if;
  if p_password is null or extensions.crypt(p_password, v_hash) <> v_hash then
    perform pg_sleep(1);
    raise exception 'delete_my_account: wrong password' using errcode = '28P01';
  end if;

  for v_board in select b.id from public.boards b where b.created_by = v_uid loop
    v_new_owner := null;
    if p_shared_boards = 'transfer' then
      select m.user_id into v_new_owner
        from public.board_members m
       where m.board_id = v_board.id
       order by (m.role = 'editor') desc, m.created_at asc, m.user_id asc
       limit 1;
    end if;

    if v_new_owner is null then
      delete from public.boards where id = v_board.id;
    else
      update public.boards set created_by = v_new_owner where id = v_board.id;
      delete from public.board_members where board_id = v_board.id and user_id = v_new_owner;
    end if;
  end loop;

  delete from public.board_invites where email = v_email;
  update public.board_invites set invited_by_email = null where lower(invited_by_email) = v_email;

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.account_deletion_preview(), public.delete_my_account(text, text) from public, anon;
grant execute on function public.account_deletion_preview(), public.delete_my_account(text, text) to authenticated;
