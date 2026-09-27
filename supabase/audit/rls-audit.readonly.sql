-- =============================================================================
-- RLS / RPC Audit — READ ONLY
-- =============================================================================
-- این اسکریپت هیچ چیزی را تغییر نمی‌دهد (فقط SELECT از کاتالوگ‌های سیستمی).
-- در Supabase Dashboard → SQL Editor اجرا کنید.
--
-- چرا این فایل لازم است: کلید `anon` فقط از طریق PostgREST دسترسی می‌دهد و
-- PostgREST کاتالوگ `pg_policies` را expose نمی‌کند. پس وضعیت واقعی policyها
-- فقط از داخل خود دیتابیس قابل خواندن است.
-- =============================================================================

-- ۱) جدول اصلی گزارش: RLS و پوشش CRUD هر جدول
select
  c.relname                                       as "جدول",
  c.relrowsecurity                                as "RLS فعال",
  c.relforcerowsecurity                           as "RLS اجباری",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('r','*'))                    as "policy_select",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('a','*'))                    as "policy_insert",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('w','*'))                    as "policy_update",
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname
       and p.cmd in ('d','*'))                    as "policy_delete"
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

-- ۲) متن کامل policyها — برای بازبینی منطق مالکیت
select
  tablename  as "جدول",
  policyname as "نام_policy",
  cmd        as "عملیات",
  permissive as "permissive",
  roles::text as "نقش‌ها",
  qual       as "using_رد",
  with_check as "with_check"
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- ۳) RPCها: نوع امنیت، search_path و grantها
select
  p.proname                                        as "تابع",
  pg_get_function_identity_arguments(p.oid)        as "آرگومان‌ها",
  case p.prosecdef
    when true  then 'SECURITY DEFINER'
    else 'SECURITY INVOKER'
  end                                              as "امنیت",
  coalesce(array_to_string(p.proconfig, ','), '(تنظیم نشده)') as "config",
  (select count(*) from pg_proc x
    where x.oid = p.oid and x.proconfig @> ARRAY['search_path='])
                                                   as "search_path_تنظیم",
  has_function_privilege('anon',      p.oid, 'EXECUTE') as "anon_executes",
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as "authenticated_executes"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;

-- ۴) هشدارهای امنیتی
-- الف) تابع SECURITY DEFINER بدون search_path ثابت = خطر hijack شدن search_path
select
  p.proname as "تابع_خطرناک",
  'SECURITY DEFINER بدون search_path ثابت' as "مشکل"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and not exists (
    select 1 from pg_proc x
    where x.oid = p.oid and x.proconfig @> ARRAY['search_path=']
  );

-- ب) تابعی که anon هم می‌تواند اجرا کند
select
  p.proname as "تابع_باز_برای_anon",
  'anon مجاز به EXECUTE است' as "مشکل"
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and has_function_privilege('anon', p.oid, 'EXECUTE');

-- ج) جدولی که به anon اجازه‌ی نوشتن می‌دهد
select
  c.relname as "جدول_باز_برای_نوشتن",
  'دسترسی نوشتن به anon داده شده' as "مشکل"
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
  and has_table_privilege('anon', c.oid, 'INSERT,UPDATE,DELETE');

-- ۴) ستون‌های واقعی هر جدول (تأیید اینکه Types پروژه با دیتابیس هم‌خوان است)
select
  table_name as "جدول",
  column_name as "ستون",
  data_type as "نوع",
  is_nullable as "nullable"
from information_schema.columns
where table_schema = 'public'
order by table_name, ordinal_position;
