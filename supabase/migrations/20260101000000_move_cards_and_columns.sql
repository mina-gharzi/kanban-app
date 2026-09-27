-- ============================================================================
-- زنجیره‌ی Foreign Key با رفتار ON DELETE CASCADE
--
-- چرا لازم است: UI هنگام حذف بورد/ستون، رکوردهای فرزند را هم از کش برمی‌دارد
-- و فرض می‌کند دیتابیس هم آن‌ها را حذف می‌کند. اگر FK با CASCADE نباشد، حذف
-- با خطای FK violation رد می‌شود؛ اگر اصلاً FK نباشد، orphan در جدول باقی
-- می‌ماند و هیچ‌وقت پاک نمی‌شود و دیگر دیده هم نمی‌شود (چون getBoardData
-- کارت‌ها را با فیلتر column_id می‌خواند).
--
-- این بخش *افزودنی* است: اگر FK از قبل وجود داشته باشد، دست نمی‌خورد و فقط
-- گزارش می‌دهد. عمداً رفتارِ FK موجود بازنویسی نمی‌شود، چون تغییر خاموشِ
-- ON DELETE می‌تواند داده‌ی موجود را پاک کند. اگر notice گفت که FK از قبل
-- هست، باید رفتار ON DELETE آن را دستی بررسی کرد.
-- ============================================================================
do $$
declare
  r        record;
  v_attnum smallint;
  v_action text;
begin
  for r in
    select * from (values
      ('public.columns'::regclass, 'board_id',   'public.boards'::regclass,  'columns_board_id_fkey'),
      ('public.cards'  ::regclass, 'column_id',  'public.columns'::regclass, 'cards_column_id_fkey')
    ) as t(rel, col, refrel, conname)
  loop
    select attnum into v_attnum
      from pg_attribute
     where attrelid = r.rel
       and attname   = r.col
       and not attisdropped;

    if v_attnum is null then
      raise exception 'FK setup failed: column %.% does not exist', r.rel, r.col;
    end if;

    if exists (
      select 1 from pg_constraint
       where conrelid = r.rel
         and contype   = 'f'
         and conkey    = array[v_attnum::int2]
    ) then
      -- FK از قبل هست، اما رفتار ON DELETE آن باید دقیقاً دیده شود؛ حدس‌زدن
      -- ناامن است. کد confdeltype: a=restrict n=no action c=cascade …
      select case c.confdeltype
               when 'c' then 'CASCADE'
               when 'n' then 'NO ACTION'
               when 'a' then 'RESTRICT'
               when 'r' then 'SET NULL'
               when 'd' then 'SET DEFAULT'
               else c.confdeltype::text
             end
        into v_action
        from pg_constraint c
       where c.conrelid = r.rel
         and c.contype   = 'f'
         and c.conkey    = array[v_attnum::int2]
       limit 1;

      if v_action = 'CASCADE' then
        raise notice 'FK %.% -> %.id exists with ON DELETE CASCADE; left unchanged.',
          r.rel, r.col, r.refrel;
      else
        -- رفتار موجود عمداً دست نمی‌خورد، ولی هشدار جدی داده می‌شود چون UI
        -- حذف آبشاری را فرض می‌کند: اگر این مقدار CASCADE نشود، حذف ستونی که
        -- کارت دارد با خطای FK violation رد می‌شود.
        raise warning
          'FK %.% -> %.id exists but ON DELETE is %, not CASCADE. Deleting a parent row will FAIL with an FK violation. Review manually.',
          r.rel, r.col, r.refrel, v_action;
      end if;
    else
      execute format(
        'alter table %s add constraint %I foreign key (%I) references %s(id) on delete cascade',
        r.rel, r.conname, r.col, r.refrel
      );
      raise notice 'FK %.% -> %.id added with ON DELETE CASCADE', r.rel, r.col, r.refrel;
    end if;
  end loop;
end $$;


-- ============================================================================
-- ۲) جابه‌جایی گروهی کارت‌ها، در یک تراکنش و با اعتبارسنجی سمت دیتابیس
--
-- چرا RPC و نه bulk upsert از PostgREST؟
--
-- کلاینت قبلاً از `upsert(..., { onConflict: 'id' })` استفاده می‌کرد و همیشه
-- با خطای 23502 می‌افتاد:
--     null value in column "title" of relation "cards" violates not-null constraint
--
-- دلیلش این است که `upsert` در PostgREST یک `INSERT ... ON CONFLICT DO UPDATE`
-- واقعی است. Postgres توکن NOT NULL را روی **tuple پیشنهادیِ insert** اعمال
-- می‌کند، *قبل* از اینکه arbiter index بررسی شود و شاخه‌ی DO UPDATE انتخاب
-- گردد. پس حتی وقتی id از قبل وجود دارد، نبودن title کل دستور را رد می‌کند.
--
-- راه درست UPDATE خالص است: نه INSERT‌ای در کار است، نه شاخه‌ای که بتواند
-- ستون‌های دیگر (title/description/...) را با مقدار کهنه‌ی کلاینت بازنویسی کند.
--
-- چرا اعتبارسنجی لازم است، حتی با RLS؟
--
-- `security invoker` یعنی RLS دیتابیس همچنان اجرا می‌شود و این تابع هیچ
-- سطح دسترسی تازه‌ای نمی‌سازد. ولی RLS به‌تنهایی جلوی این حمله را *نمی‌گیرد*:
-- کاربری که مالک کارت است اجازه‌ی UPDATE آن کارت را دارد (RLS اجازه می‌دهد)،
-- و از آن‌جا که `column_id` فقط یک *مقدار* است و نه join، هیچ RLS یا FK
--ای لزوماً بررسی نمی‌کند که ستون مقصد متعلق به همان بورد یا حتی همان کاربر
-- باشد. یک FK فقط وجود id ستون مقصد را چک می‌کند، نه مالکیتش را. پس بدون
-- بررسی صریح، یک کاربر می‌تواند کارت خودش را به ستونِ بوردِ کاربر دیگر بچسباند
-- و عملاً آن را از کاربر دیگر پنهان کند. چیزی که RLS **نمی‌گوید** و ما باید
-- خودمان بگوییم: "مبدأ و مقصد، هر دو مال این کاربر و متعلق به یک بوردند."
--
-- تصمیم طراحی: `security invoker` + بررسی صریح.
-- `security definer` اینجا مزیتی ندارد و هزاران هزار دام دارد (search_path،
-- مالکیت تابع، search_path injection). invoker یعنی RLS فعال می‌ماند و
-- تابع نمی‌تواند از آن عبور کند؛ بررسی‌های صریح هم لایه‌ی دوم می‌شوند.
--
-- نوع ستون `position` در زمان اجرا از کاتالوگ Postgres خوانده می‌شود تا این
-- فایل به نوع دقیق ستون وابسته نباشد (integer / numeric / double precision).
-- ============================================================================
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
      -- ستون position در دیتابیس واقعی از نوع integer است (بررسی شد). پس مقدار
      -- باید تمام‌عدد باشد؛ بدون این بررسی، کلاینتی که 2.5 بفرستد به‌جای خطا
      -- گرد می‌شود و ترتیب کارت‌ها بی‌سروصدا به هم می‌ریزد.
      and (m.move ->> 'position') ~ '^-?[0-9]+$'
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

comment on function public.move_cards(jsonb) is
  'جابه‌جایی اتمیک چند کارت. ورودی: [{"id":uuid,"column_id":uuid,"position":number}]';


-- ============================================================================
-- ۳) جابه‌جایی گروهی ستون‌ها
--
-- همان منطق کارت‌ها، بدون مقصد: ستون جایی جابه‌جا نمی‌شود، فقط position عوض
-- می‌کند. قیدِ «همه‌ی ستون‌ها متعلق به یک بوردِ متعلق به همین کاربر» معادل
-- همان قید مبدأ/مقصد است: ترتیب ستون‌ها فقط درون یک بورد معنا دارد و باز
-- جابه‌جا کردن ستون‌های دو بورد مختلف، position دو بورد را با هم به هم می‌ریزد.
-- ============================================================================
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
      and (m.move ->> 'position') ~ '^-?[0-9]+$'
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

comment on function public.move_columns(jsonb) is
  'جابه‌جایی اتمیک چند ستون. ورودی: [{"id":uuid,"position":number}]';


-- ============================================================================
-- ۴) دسترسی اجرای توابع
--
-- CREATE FUNCTION به‌طور پیش‌فرض EXECUTE را به PUBLIC می‌دهد، یعنی نقش anon هم
-- می‌تواند تابع را صدا بزند. RLS جلویش را می‌گیرد، ولی لایه‌ی اول نباید لازم
-- باشد. مجوز به authenticated محدود و از public/anon گرفته می‌شود.
--
-- چون شاید این پروژه روی Postgresی اجرا شود که نقش‌های Supabase را ندارد،
-- بررسی وجود نقش انجام می‌شود تا migration در هر دو حالت قابل اجرا باشد.
-- ============================================================================
do $$
declare
  r         record;
  v_fn      text;
  v_granted boolean;
begin
  foreach v_fn in array array['public.move_cards(jsonb)', 'public.move_columns(jsonb)'] loop
    execute format('revoke all on function %s from public', v_fn);

    v_granted := exists (select 1 from pg_roles where rolname = 'anon');
    if v_granted then
      execute format('revoke all on function %s from anon', v_fn);
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('grant execute on function %s to authenticated', v_fn);
      raise notice 'EXECUTE on %s granted to authenticated', v_fn;
    else
      raise notice 'role "authenticated" not found; no grant issued for %s', v_fn;
    end if;
  end loop;
end $$;
