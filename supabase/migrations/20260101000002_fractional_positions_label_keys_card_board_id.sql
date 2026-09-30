-- ============================================================================
-- ۱) position کسری (fractional indexing)
--
-- جابه‌جایی فقط یک سطر را عوض می‌کند (position = میانگین دو همسایه) و کل
-- ستون را دوباره شماره‌گذاری نمی‌کند؛ پس دو تبِ هم‌زمان روی position تکراری
-- با هم رقابت نمی‌کنند. نوع ستون باید عددِ اعشاری باشد.
-- ============================================================================
alter table public.cards   alter column position type double precision using position::double precision;
alter table public.columns alter column position type double precision using position::double precision;

-- RPCها: اعتبارسنجی «تمام‌عدد» برداشته شد؛ نوع ستون از کاتالوگ خوانده می‌شود
-- و `jsonb_typeof = 'number'` کافی است. (create or replace، grantهای قبلی
-- را نگه می‌دارد.)

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
  --   ۱) کارت وجود دارد و متعلق به بوردی است که created_by آن auth.uid() است
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
           and b.created_by = auth.uid()
      );

  if v_valid <> v_expected then
    raise exception 'move_cards: % of % moves rejected (card not owned by you, or source and destination are not on the same board)',
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
           and b.created_by = auth.uid()
      );

  if v_valid <> v_expected then
    raise exception 'move_columns: % of % moves rejected (column not owned by you)',
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

-- ============================================================================
-- ۲) برچسب به‌صورت کلید، نه رنگ CSS
--
-- مقدارهای ناشناخته null می‌شوند (داده‌ی خراب یا دستی). اگر جدول مقدار دیگری
-- دارد، پیش از اجرا بررسی کنید:
--   select label_color, count(*) from public.cards group by 1;
--
-- ترتیب استقرار: اول این مهاجرت، بلافاصله بعد کلاینت. کلاینت جدید هر دو
-- شکل را می‌خواند، ولی کلاینتِ قدیمی که هنوز `rgb(...)` بنویسد به constraint
-- می‌خورد.
-- ============================================================================
update public.cards
   set label_color = case label_color
     when 'rgb(190, 49, 68)'  then 'red'
     when 'rgb(58, 71, 80)'   then 'blue'
     when 'rgb(78, 140, 105)' then 'green'
     when 'rgb(200, 160, 60)' then 'yellow'
     when 'rgb(120, 90, 160)' then 'purple'
     else null
   end
 where label_color is not null
   and label_color not in ('red', 'blue', 'green', 'yellow', 'purple');

alter table public.cards drop constraint if exists cards_label_color_check;
alter table public.cards add constraint cards_label_color_check
  check (label_color is null or label_color in ('red', 'blue', 'green', 'yellow', 'purple'));


-- ============================================================================
-- ۳) cards.board_id (denormalized) برای فیلتر سمت سرور در Realtime
--
-- Realtime فقط روی ستون‌های خودِ جدول فیلتر می‌کند و cards فقط column_id
-- داشت. trigger مقدار را از روی ستون می‌سازد تا هرگز با column_id ناسازگار
-- نشود (RPC هم فقط بین ستون‌های یک بورد جابه‌جا می‌کند). trigger روی board_id هم
-- فعال است تا کلاینت نتواند مقدار دلخواه بنویسد؛ مقدار همیشه از column_id می‌آید.
-- ============================================================================
alter table public.cards add column if not exists board_id uuid;

update public.cards c
   set board_id = col.board_id
  from public.columns col
 where col.id = c.column_id
   and c.board_id is null;

-- کارتی که column_id ندارد (ستون cards.column_id در دیتابیس nullable است) به
-- هیچ بوردی وصل نیست، RLS هم آن را برای همه پنهان می‌کند؛ یعنی داده‌ی یتیم.
-- بی‌صدا حذفش نمی‌کنیم: اگر بود، migration با پیام روشن متوقف می‌شود.
do $$
begin
  if exists (select 1 from public.cards where board_id is null) then
    raise exception
      'cards without a resolvable board exist (null/dangling column_id); inspect with: select id, title, column_id from public.cards where board_id is null'
      using errcode = '23502';
  end if;
end;
$$;

alter table public.cards alter column board_id set not null;

alter table public.cards drop constraint if exists cards_board_id_fkey;
alter table public.cards add constraint cards_board_id_fkey
  foreign key (board_id) references public.boards(id) on delete cascade;

create index if not exists cards_board_id_idx on public.cards (board_id);

create or replace function public.cards_set_board_id()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  select c.board_id into new.board_id
    from public.columns c
   where c.id = new.column_id;

  if new.board_id is null then
    raise exception 'cards: column % not found or not visible', new.column_id
      using errcode = '23503';
  end if;
  return new;
end;
$$;

drop trigger if exists cards_set_board_id on public.cards;
create trigger cards_set_board_id
  before insert or update of column_id, board_id on public.cards
  for each row execute function public.cards_set_board_id();

-- برای ترتیب قطعی صفحه‌بندی (position, id)
create index if not exists cards_column_position_idx on public.cards (column_id, position, id);
create index if not exists columns_board_position_idx on public.columns (board_id, position, id);
