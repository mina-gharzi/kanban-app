-- ============================================================================
-- سخت‌کردن schema (بر پایه‌ی Schema Visualizer دیتابیس زنده)
--
-- هر مورد فقط وقتی اعمال می‌شود که داده‌ی فعلی اجازه بدهد؛ در غیر این‌صورت
-- NOTICE می‌دهد و رد می‌شود (migration را نمی‌شکند).
-- ============================================================================

-- ۱) created_at از `timestamp` (بدون منطقه‌ی زمانی) به `timestamptz`.
--    بدون منطقه، PostgREST رشته‌ای بدون offset برمی‌گرداند و `new Date(...)`
--    آن را ساعت محلی کاربر می‌فهمد؛ نزدیک نیمه‌شب تاریخ یک روز جابه‌جا می‌شود.
--    فرض: مقدارهای قدیمی UTC ثبت شده‌اند (پیش‌فرض now() در Supabase).
do $$
declare t text;
begin
  foreach t in array array['boards', 'cards'] loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public' and table_name = t
         and column_name = 'created_at' and data_type = 'timestamp without time zone'
    ) then
      execute format(
        'alter table public.%I alter column created_at type timestamptz using created_at at time zone %L',
        t, 'UTC');
    end if;
  end loop;
end;
$$;

-- ۲) کلیدهای خارجی نباید null باشند. RLS الان سطرهای null را رد می‌کند، ولی
--    schema باید همین را تضمین کند.
do $$
begin
  if not exists (select 1 from public.columns where board_id is null) then
    alter table public.columns alter column board_id set not null;
  else
    raise notice 'columns.board_id has NULL rows; NOT NULL skipped';
  end if;
  if not exists (select 1 from public.cards where column_id is null) then
    alter table public.cards alter column column_id set not null;
  else
    raise notice 'cards.column_id has NULL rows; NOT NULL skipped';
  end if;
end;
$$;

-- ۳) سقف طول، هم‌راستا با اعتبارسنجی کلاینت (عنوان ۱۲۰). `not valid` یعنی فقط
--    نوشتن‌های جدید بررسی می‌شوند؛ سطرهای قدیمی رد نمی‌شوند. بعد از بررسی داده:
--      alter table public.cards validate constraint cards_title_len;  (و مشابه)
alter table public.boards  drop constraint if exists boards_title_len;
alter table public.columns drop constraint if exists columns_title_len;
alter table public.cards   drop constraint if exists cards_title_len;
alter table public.cards   drop constraint if exists cards_description_len;

alter table public.boards  add constraint boards_title_len  check (char_length(title) between 1 and 120) not valid;
alter table public.columns add constraint columns_title_len check (char_length(title) between 1 and 120) not valid;
alter table public.cards   add constraint cards_title_len   check (char_length(title) between 1 and 120) not valid;
alter table public.cards   add constraint cards_description_len
  check (description is null or char_length(description) <= 10000) not valid;

-- ۴) هر policy روی boards با created_by فیلتر می‌کند
create index if not exists boards_created_by_idx on public.boards (created_by);
