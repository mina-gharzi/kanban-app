-- =============================================================================
-- RLS / RPC Audit — READ ONLY
-- =============================================================================
-- این اسکریپت هیچ چیزی را تغییر نمی‌دهد (فقط SELECT از کاتالوگ‌های سیستمی).
-- در Supabase Dashboard → SQL Editor اجرا کنید.
--
-- چرا این فایل لازم است: کلید `anon` فقط از طریق PostgREST دسترسی می‌دهد و
-- PostgREST کاتالوگ `pg_policies` را expose نمی‌کند. (به‌صورت تجربی تأیید شده:
-- فراخوانی `/rest/v1/pg_policies` با کلید publishable خطای 404
-- PGRST205 "Could not find the table 'public.pg_policies' in the schema cache"
-- می‌دهد، چون PostgREST فقط شِمای `public` را منتشر می‌کند.) پس وضعیت واقعی
-- policyها فقط از داخل خود دیتابیس قابل خواندن است.
--
-- -----------------------------------------------------------------------------
-- دو باگی که در نسخه‌ی قبلی این فایل بود و اینجا اصلاح شده‌اند:
--
-- ۱) `pg_policies.cmd` مقدار «کلیدواژه» برمی‌گرداند، نه حرف.
--    ستون `cmd` در ویوی `pg_policies` از روی `polcmd` ساخته می‌شود:
--        'r' → 'SELECT' , 'a' → 'INSERT' , 'w' → 'UPDATE' ,
--        'd' → 'DELETE' , '*' → 'ALL'
--    نسخه‌ی قبلی با `p.cmd in ('r','*')` می‌شمرد، که هیچ‌وقت با هیچ سطری
--    نمی‌خواند؛ در نتیجه ستون‌های policy_* همیشه `0` بود و گزارش دقیقاً
--    خلاف واقع نشان می‌داد. اینجا از خودِ کلیدواژه‌ها استفاده می‌شود.
--
-- ۲) شرطِ `search_path` هیچ‌وقت درست تشخیص داده نمی‌شد.
--    `proconfig` تنظیمات GUC را به شکل `name=value` نگه می‌دارد و مقدارِ
--    تهی با کوتیشن نوشته می‌شود: `SET search_path = ''` در کاتالوگ به صورت
--    `search_path=""` ذخیره می‌شود، نه `search_path=`.
--    پس شرط قدیمی `proconfig @> ARRAY['search_path=']` دقیقاً همان حالتی را
--    که امن است (pinned/خالی) نمی‌دید و در عین حال `search_path=public` را
--    می‌دید. نتیجه: هشدارِ «SECURITY DEFINER بدون search_path» برای
--    functionهایی که به‌درستی pin شده بودند، مثبتِ کاذب می‌داد و برای
--    functionهای pin‌نشده، منفیِ کاذب.
--    اینجا با unnest + الگوی `^search_path\s*=` سنجیده می‌شود که هر دو حالت
--    `search_path=""` و `search_path=public` را درست می‌بیند.
--
-- دو اصلاح دیگر که در همین مسیر لازم بود:
-- ۳) `has_table_privilege('anon', ..., 'INSERT,UPDATE,DELETE')` فقط وقتی true
--    است که هر سه مجوز با هم داده شده باشند. جدولی که فقط INSERT به anon دارد
--    (سناریوی متداولِ بد) بی‌سروصدا از قلم می‌افتاد. حالا هر مجوز جدا گزارش
--    می‌شود.
-- ۴) `has_function_privilege('anon', ...)` اگر نقش `anon` وجود نداشته باشد خطای
--    runtime می‌دهد و چون SQL Editor کل اسکریپت را در یک تراکنش می‌فرستد،
--    همه‌ی بخش‌های بعدی هم از دست می‌رفت. وجود نقش اول بررسی می‌شود.
--
-- این فایل عمداً هیچ `create` / `alter` / `drop` / `grant` / `revoke` ندارد.
--
-- پیش‌نیاز: نقش‌های `anon` و `authenticated` باید وجود داشته باشند (روی
-- Supabase همیشه هستند). بخش‌های ۵ و ۶ این را با CASE محافظت می‌کنند تا نبودِ
-- نقش کل اسکریپت را متوقف نکند؛ بخش ۱ و ۴ فرض را صریح می‌گیرند.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ۰) زمینه: دقیقاً کجا و با چه نقشی اجرا شده
--    اگر این اسکریپت را با نقش anon اجرا کنید، همه‌ی ستون‌های کاتالوگ خالی
--    می‌آیند و گزارش گمراه‌کننده می‌شود. این بخش جلوی آن را می‌گیرد.
-- -----------------------------------------------------------------------------
select
  current_database()                                     as "دیتابیس",
  current_user                                           as "نقش_فعلی",
  current_setting('request.jwt.claims', true)            as "jwt_claims",
  current_setting('request.jwt.claim.sub', true)         as "jwt_sub",
  pg_is_in_recovery()                                    as "فقط_خواندنی_standby",
  version();

select rolname as "نقش"
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role', 'authenticator', 'supabase_admin')
order by rolname;


-- -----------------------------------------------------------------------------
-- ۱) جدول اصلی گزارش: RLS و پوشش CRUD هر جدول
--    اصلاح‌شده: کدهای `cmd` به کلیدواژه‌های واقعی (باگ ۱).
--    خروجی هر ستون = تعداد policyهایی که آن عملیات را پوشش می‌دهند؛
--    policy با `cmd = 'ALL'` در هر چهار ستون شمرده می‌شود، چون واقعاً همه را
--    پوشش می‌دهد.
-- -----------------------------------------------------------------------------
select
  c.relname                                       as "جدول",
  c.relrowsecurity                                as "RLS فعال",
  c.relforcerowsecurity                           as "RLS اجباری",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('SELECT', 'ALL'))            as "policy_select",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('INSERT', 'ALL'))            as "policy_insert",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('UPDATE', 'ALL'))            as "policy_update",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('DELETE', 'ALL'))            as "policy_delete",
  -- روشنی جدول برای نقش‌های عمومی: آیا اصلاً مجوز پایه وجود دارد؟
  case when exists (select 1 from pg_roles where rolname = 'anon')
       then has_table_privilege('anon', c.oid, 'SELECT')
       else false
  end                                               as "anon_مجوز_select",
  case when exists (select 1 from pg_roles where rolname = 'authenticated')
       then has_table_privilege('authenticated', c.oid, 'SELECT')
       else false
  end                                               as "authenticated_مجوز_select"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- هشدار: RLS فعال ولی بدون هیچ policy یعنی جدول برای همه قفل کامل است
select
  c.relname as "جدول",
  'RLS روشن اما هیچ policy ندارد — برای همه غیرقابل‌دسترسی است' as "مشکل"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  );

-- هشدار: RLS خاموش. این بدترین حالت ممکن است: هر کسی که مجوز پایه داشته
-- باشد (شامل anon) کل جدول را می‌بیند.
select
  c.relname as "جدول_بدون_RLS",
  'RLS غیرفعال — کل جدول برای هر نقشی که مجوز داشته باشد باز است' as "مشکل",
  has_table_privilege('anon', c.oid, 'SELECT')  as "anon_می‌تواند_بخواند",
  has_table_privilege('anon', c.oid, 'INSERT')  as "anon_می‌تواند_بنویسد"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
order by c.relname;


-- -----------------------------------------------------------------------------
-- ۲) متن کامل policyها — برای بازبینی منطق مالکیت
--    این همان کوئری مرجع است. ستون‌های `*_بررسی` کمکی اضافه شده‌اند تا
--    شرط‌های تهی/بی‌معنا (مثلاً `using (true)`) بدون خواندن متن SQL دیده شوند.
-- -----------------------------------------------------------------------------
select
  tablename  as "جدول",
  policyname as "نام_policy",
  cmd        as "عملیات",
  permissive as "permissive",
  roles::text as "نقش‌ها",
  qual       as "using_رد",
  with_check as "with_check",
  -- USING فقط برای SELECT/UPDATE/DELETE/ALL معنا دارد؛ برای INSERT همیشه NULL
  (cmd = 'INSERT')                                as "فقط_insert_است",
  (qual is null and cmd <> 'INSERT')               as "بدون_using",
  (with_check is null and cmd <> 'SELECT')        as "بدون_with_check",
  -- شرطِ بی‌اثر: policy که همیشه درست است
  (qual is not null and btrim(qual) in ('true', '(true)'))       as "using_همیشه_درست",
  (with_check is not null and btrim(with_check) in ('true', '(true)')) as "check_همیشه_درست",
  -- آیا مالکیت را به auth.uid() وصل کرده است؟ (نه auth.role() و نه مقدار ثابت)
  (coalesce(qual, '')        ~ 'auth\.uid\(\)') as "using_به_uid_وصل_است",
  (coalesce(with_check, '') ~ 'auth\.uid\(\)') as "check_به_uid_وصل_است"
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;


-- -----------------------------------------------------------------------------
-- ۳) ماتریس شکاف: جدول × عملیات
--    این همان جدول «انتظار / واقعیت / شکاف» است، اما به‌شکل کاتالوگ.
--    برای هر (جدول، عملیات) می‌گوید policy دارد یا نه، USING دارد یا نه،
--    WITH CHECK دارد یا نه، و نقش‌ها چه هستند.
--
--    نکته‌ی تفسیری که در این ماتریس حیاتی است:
--    policy با `cmd = 'ALL'` یک USING را برای SELECT/UPDATE/DELETE و یک
--    WITH CHECK را برای INSERT/UPDATE به‌طور ضمنی به ارث می‌رساند. یعنی یک
--    policy از نوع ALL که فقط USING نوشته شده باشد، INSERT را می‌بندد ولی
--    UPDATE را *بدون* with check رها می‌کند — و همان‌جاست که یک کاربر می‌تواند
--    مالکیتِ سطر را به کاربر دیگری منتقل کند. ستون‌های زیر دقیقاً همین را
--    نشان می‌دهند.
-- -----------------------------------------------------------------------------
with ops(ord, op) as (values (1,'SELECT'), (2,'INSERT'), (3,'UPDATE'), (4,'DELETE')),
tbl as (
  select c.relname, c.relrowsecurity
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r'
),
pol as (
  select p.* from pg_policies p where p.schemaname = 'public'
),
cover as (   -- هر policy، عملیات‌هایی را که واقعاً پوشش می‌دهد باز می‌کند
  select
    p.tablename, p.policyname, p.roles, p.qual, p.with_check,
    o.op,
    -- آیا این policy برای این عملیات شرط USING می‌آورد؟
    (o.op <> 'INSERT' and p.qual is not null) as gives_using,
    -- آیا این policy برای این عملیات شرط WITH CHECK می‌آورد؟
    (o.op in ('INSERT', 'UPDATE') and p.with_check is not null) as gives_check
  from pol p
  join ops o on (p.cmd = o.op or p.cmd = 'ALL')
)
select
  t.relname                            as "جدول",
  t.relrowsecurity                     as "RLS",
  o.op                                 as "عملیات",
  count(cv.policyname)                as "تعداد_policy",
  -- عملیات‌های خواندنی و نوشتنی به USING نیاز دارند؛ INSERT به WITH CHECK
  count(*) filter (where cv.gives_using)  as "با_using",
  count(*) filter (where cv.gives_check)  as "با_with_check",
  string_agg(distinct cv.policyname, ', ') filter (where cv.policyname is not null) as "نام_policy_ها",
  string_agg(distinct array_to_string(cv.roles, ','), ' | ') filter (where cv.roles is not null) as "نقش‌ها",
  case
    when not t.relrowsecurity then 'بحرانی: RLS خاموش — بدون هیچ فیلتری همه‌ی سطرها'
    when count(cv.policyname) = 0 then 'بسته: هیچ policy — این عملیات برای همه رد می‌شود'
    when o.op in ('SELECT','UPDATE','DELETE') and count(*) filter (where cv.gives_using) = 0
      then 'سوراخ: policy دارد ولی USING ندارد'
    when o.op = 'INSERT' and count(*) filter (where cv.gives_check) = 0
      then 'بسته: WITH CHECK ندارد — INSERT برای همه رد می‌شود'
    when o.op = 'UPDATE' and count(*) filter (where cv.gives_check) = 0
      then 'بحرانی: UPDATE بدون WITH CHECK — کاربر می‌تواند سطر را به مالک دیگری منتقل کند'
    when bool_or(coalesce(cv.qual, '') ~ '^\(?\s*true\s*\)?$')
      then 'سوراخ: شرط همیشه درست است (true) — policy بی‌اثر'
    else 'پوشش دارد'
  end                                 as "وضعیت"
from tbl t
cross join ops o
left join cover cv
  on cv.tablename = t.relname and cv.op = o.op
group by t.relname, t.relrowsecurity, o.ord, o.op
order by t.relname, o.ord;


-- -----------------------------------------------------------------------------
-- ۴) مجوزهای پایه روی جدول‌ها
--    RLS فقط «کدام سطر» را تعیین می‌کند؛ مجوز پایه تعیین می‌کند «آیا اصلاً
--    می‌شود کوئری زد». جدولی که مجوز ندارد با RLS درست هم باز نمی‌شود.
-- -----------------------------------------------------------------------------
select
  table_name  as "جدول",
  grantee     as "نقش",
  privilege_type as "مجوز"
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- نسخه‌ی فشرده: ماتریس مجوز × نقش. خالی بودنِ یک خانه یعنی آن مجوز داده نشده.
select
  c.relname as "جدول",
  pr.priv   as "مجوز",
  has_table_privilege('anon',           c.oid, pr.priv) as "anon",
  has_table_privilege('authenticated',  c.oid, pr.priv) as "authenticated",
  has_table_privilege('service_role',   c.oid, pr.priv) as "service_role",
  has_table_privilege('public',         c.oid, pr.priv) as "PUBLIC"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'),
                   ('REFERENCES'), ('TRIGGER')) as pr(priv)
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname, pr.priv;


-- -----------------------------------------------------------------------------
-- ۵) RPCها: نوع امنیت، search_path و grantها
--    اصلاح‌شده: تشخیص search_path با unnest (باگ ۲)، و بررسی وجود نقش (باگ ۴).
--    ستون `search_path_مقدار` مقدار واقعی را نشان می‌دهد تا بشود دید pin شده
--    (`""` = امن‌ترین حالت) یا باز است.
-- -----------------------------------------------------------------------------
select
  p.proname                                        as "تابع",
  pg_get_function_identity_arguments(p.oid)        as "آرگومان‌ها",
  case p.prosecdef
    when true  then 'SECURITY DEFINER'
    else 'SECURITY INVOKER'
  end                                              as "امنیت",
  coalesce(array_to_string(p.proconfig, ','), '(تنظیم نشده)') as "config",
  -- درست: هر عنصری از proconfig که نامش search_path باشد، با فرمت واقعی
  (select string_agg(cfg.entry, ',' order by cfg.entry)
     from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg(entry)
    where cfg.entry ~ '^search_path\s*=')            as "search_path_مقدار",
  exists (
    select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg(entry)
     where cfg.entry ~ '^search_path\s*='
  )                                                 as "search_path_تنظیم_شده",
  -- pin واقعی یعنی فهرست اسکیمای تهی. `SET search_path = ''` در کاتالوگ
  -- به صورت `search_path=""` ذخیره می‌شود (مقدار تهی با کوتیشن نوشته می‌شود)،
  -- پس مقدارِ پس از `=` فقط «کوتیشن اختیاری» است. از regex کوتاه `^"?"$`
  -- استفاده شده تا هر دو حالت `search_path=` و `search_path=""` را بپوشاند
  -- بدون اینکه مجبور به escape کردن کوتیشنِ تکی داخل رشته‌ی SQL شویم.
  exists (
    select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg(entry)
     where cfg.entry ~ '^search_path\s*='
       and btrim(split_part(cfg.entry, '=', 2)) ~ '^"?"$'
  )                                                 as "search_path_پین_شده",
  -- CASE و نه AND: ارزیابی کوتاه‌مدت، تا نقشِ ناموجود باعث توقف کل اسکریپت نشود
  case when exists (select 1 from pg_roles where rolname = 'anon')
       then has_function_privilege('anon', p.oid, 'EXECUTE')
       else false
  end                                               as "anon_executes",
  case when exists (select 1 from pg_roles where rolname = 'authenticated')
       then has_function_privilege('authenticated', p.oid, 'EXECUTE')
       else false
  end                                               as "authenticated_executes",
  p.proconfig is null                               as "بدون_هیچ_config"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;


-- -----------------------------------------------------------------------------
-- ۶) هشدارهای امنیتی
--    همه‌ی کوئری‌های این بخش باید «صفر سطر» برگردانند. سطرِ بیشتر = مشکل.
-- -----------------------------------------------------------------------------

-- الف) تابع SECURITY DEFINER بدون search_path ثابت = خطر hijack شدن search_path
select
  p.proname as "تابع_خطرناک",
  'SECURITY DEFINER بدون search_path ثابت' as "مشکل",
  coalesce(array_to_string(p.proconfig, ','), '(هیچ)') as "config"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) as cfg(entry)
     where cfg.entry ~ '^search_path\s*='
  )
order by p.proname;

-- ب) تابعی که anon هم می‌تواند اجرا کند
--    نکته: چون CREATE FUNCTION به‌طور پیش‌فرض EXECUTE را به PUBLIC می‌دهد،
--    نبودِ این هشدار یعنی revoke واقعاً انجام شده است.
--    از CASE استفاده شده نه AND، چون Postgres ترتیب ارزیابی AND را تضمین
--    نمی‌کند و ممکن است has_function_privilege با نقشِ ناموجود خطا بدهد و
--    کل اسکریپت را از همان‌جا متوقف کند. CASE ارزیابی کوتاه‌مدت دارد.
select
  p.proname as "تابع_باز_برای_anon",
  'anon مجاز به EXECUTE است' as "مشکل"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and case
        when exists (select 1 from pg_roles where rolname = 'anon')
          then has_function_privilege('anon', p.oid, 'EXECUTE')
        else false
      end
order by p.proname;

-- ج) جدولی که به anon اجازه‌ی نوشتن می‌دهد
--    اصلاح‌شده (باگ ۳): هر مجوز جدا سنجیده می‌شود، نه «هر سه با هم».
select
  c.relname as "جدول_باز_برای_نوشتن",
  pr.priv   as "مجوز",
  'دسترسی نوشتن به anon داده شده' as "مشکل"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE')) as pr(priv)
where n.nspname = 'public' and c.relkind = 'r'
  and case
        when exists (select 1 from pg_roles where rolname = 'anon')
          then has_table_privilege('anon', c.oid, pr.priv)
        else false
      end
order by c.relname, pr.priv;

-- د) policy بدون نقش مشخص = به PUBLIC اعمال می‌شود
select
  tablename  as "جدول",
  policyname as "نام_policy",
  cmd        as "عملیات",
  'policy بدون نقش مشخص — به PUBLIC اعمال می‌شود' as "مشکل"
from pg_policies
where schemaname = 'public'
  and (roles = '{}' or roles is null or 'public' = any(roles))
order by tablename, policyname;

-- ه) policy که به auth.uid() وصل نیست. در این پروژه هر دسترسی باید از
--    auth.uid() عبور کند؛ policy بدون آن یعنی یا همه باز است یا همه بسته.
select
  tablename  as "جدول",
  policyname as "نام_policy",
  cmd        as "عملیات",
  coalesce(qual, '(null)')        as "using_رد",
  coalesce(with_check, '(null)')  as "with_check",
  'policy به auth.uid() وصل نیست' as "مشکل"
from pg_policies
where schemaname = 'public'
  and not (coalesce(qual, '') ~ 'auth\.uid\(\)')
  and not (coalesce(with_check, '') ~ 'auth\.uid\(\)')
order by tablename, policyname;

-- و) شرطِ بی‌اثر: policy که همیشه درست است
select
  tablename  as "جدول",
  policyname as "نام_policy",
  cmd        as "عملیات",
  coalesce(qual, '(null)')       as "using_رد",
  coalesce(with_check, '(null)') as "with_check",
  'شرط همیشه true است — policy عملاً هیچ فیلتری نمی‌کند' as "مشکل"
from pg_policies
where schemaname = 'public'
  and (btrim(coalesce(qual, '')) in ('true', '(true)')
    or btrim(coalesce(with_check, '')) in ('true', '(true)'))
order by tablename, policyname;

-- ز) ستون created_by روی boards: باید NOT NULL باشد تا کاربر نتواند سطر را
--    با created_by = NULL رد کند و بعد مالکیتش را از راه دور پس بگیرد.
select
  c.relname as "جدول",
  a.attname as "ستون",
  a.attnotnull as "NOT_NULL",
  pg_get_expr(ad.adbin, ad.adrelid) as "پیش‌فرض"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where n.nspname = 'public' and c.relkind = 'r' and a.attname = 'created_by'
order by c.relname;


-- -----------------------------------------------------------------------------
-- ۷) ستون‌های واقعی هر جدول (تأیید اینکه Types پروژه با دیتابیس هم‌خوان است)
--    `column_default` و `is_identity` عمداً اضافه شده‌اند: برای baseline schema
--    لازم‌اند و معمولاً در typeهای سمت کلاینت گم می‌شوند.
-- -----------------------------------------------------------------------------
select
  table_name   as "جدول",
  ordinal_position as "#",
  column_name  as "ستون",
  data_type    as "نوع",
  udt_name     as "نوع_پایه",
  is_nullable  as "nullable",
  column_default as "پیش‌فرض",
  is_identity  as "identity"
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;


-- -----------------------------------------------------------------------------
-- ۸) قیدها و ایندکس‌ها (برای بازسازی baseline لازم است)
-- -----------------------------------------------------------------------------
select
  c.relname    as "جدول",
  con.conname  as "قید",
  case con.contype
    when 'p' then 'PRIMARY KEY'
    when 'f' then 'FOREIGN KEY'
    when 'u' then 'UNIQUE'
    when 'c' then 'CHECK'
    when 'x' then 'EXCLUDE'
    else con.contype::text
  end         as "نوع",
  case con.confdeltype
    when 'c' then 'CASCADE'  when 'n' then 'NO ACTION'
    when 'a' then 'RESTRICT' when 'r' then 'SET NULL'
    when 'd' then 'SET DEFAULT' else ''
  end         as "ON_DELETE",
  pg_get_constraintdef(con.oid) as "تعریف"
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, con.conname;

select
  tablename  as "جدول",
  indexname  as "ایندکس",
  indexdef   as "تعریف"
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;

-- مقادیر مجازِ label_color: اگر چیزی غیر از پنج رنگ دیدید، مهاجرت
-- 20260101000002 روی داده‌ی ناسازگار اجرا نشده یا داده‌ی دستی اضافه شده.
select label_color, count(*) as "تعداد"
from public.cards
where label_color is not null
group by label_color
order by 2 desc;

