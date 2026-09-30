-- ============================================================================
-- RLS: نسخه‌گذاری policyهای موجود در دیتابیس زنده (بازسازی از خروجی pg_policies)
--
-- منطق تغییر نکرده: فقط مالکِ بورد (boards.created_by) به بورد، ستون‌ها و
-- کارت‌های آن دسترسی دارد. دو بهبود نسبت به نسخه‌ی زنده:
--   ۱) `to authenticated` به‌جای public
--   ۲) `(select auth.uid())` به‌جای `auth.uid()`؛ یک‌بار برای کل query حساب
--      می‌شود، نه برای هر سطر (توصیه‌ی Supabase Performance Advisor)
--
-- هر policy با drop + create در همین تراکنشِ migration جایگزین می‌شود، پس
-- لحظه‌ای بدون policy نیست. با تکرار اجرا هم همان نتیجه را می‌دهد.
-- ============================================================================

alter table public.boards  enable row level security;
alter table public.columns enable row level security;
alter table public.cards   enable row level security;

-- ─── boards ────────────────────────────────────────────────────────────────
drop policy if exists "Users manage own boards" on public.boards;
create policy "Users manage own boards"
  on public.boards
  for all
  to authenticated
  using      ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

-- ─── columns ───────────────────────────────────────────────────────────────
drop policy if exists "Users manage columns of own boards" on public.columns;
create policy "Users manage columns of own boards"
  on public.columns
  for all
  to authenticated
  using (
    exists (
      select 1 from public.boards b
       where b.id = columns.board_id
         and b.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.boards b
       where b.id = columns.board_id
         and b.created_by = (select auth.uid())
    )
  );

-- ─── cards ─────────────────────────────────────────────────────────────────
drop policy if exists "Users manage cards of own boards" on public.cards;
create policy "Users manage cards of own boards"
  on public.cards
  for all
  to authenticated
  using (
    exists (
      select 1
        from public.columns c
        join public.boards  b on b.id = c.board_id
       where c.id = cards.column_id
         and b.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
        from public.columns c
        join public.boards  b on b.id = c.board_id
       where c.id = cards.column_id
         and b.created_by = (select auth.uid())
    )
  );

-- ─── دفاع در عمق ───────────────────────────────────────────────────────────
-- کاربر ناشناس هیچ‌وقت نباید به این جدول‌ها برسد (RLS الان هم جلویش را
-- می‌گیرد؛ این فقط لایه‌ی دوم است).
revoke all on public.boards, public.columns, public.cards from anon;

-- created_by خودکار پر شود؛ کلاینت فعلی هنوز می‌فرستد و WITH CHECK بالا
-- مقدار دیگران را رد می‌کند. NOT NULL فقط اگر هیچ سطر null نداشته باشیم.
alter table public.boards alter column created_by set default auth.uid();

do $$
begin
  if not exists (select 1 from public.boards where created_by is null) then
    alter table public.boards alter column created_by set not null;
  else
    raise notice 'boards.created_by has NULL rows; NOT NULL skipped';
  end if;
end;
$$;
