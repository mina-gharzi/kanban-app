-- ============================================================================
-- فعال‌سازی Realtime برای boards / columns / cards
--
-- چه چیزی اثبات شد (آزمون زنده، نه حدس):
--
--   subscribe روی هر سه جدول با وضعیت SUBSCRIBED «موفق» برمی‌گردد و سرور حتی
--   برای هر جدول یک subscription id می‌دهد، پس از نگاه اول همه‌چیز درست است.
--   ولی بلافاصله بعد، سرور یک پیام `system` با status=error می‌فرستد:
--
--     "Unable to subscribe to changes with given parameters.
--      Please check Realtime is enabled for the given connect parameters:
--      [event: *, schema: public, table: boards, filters: [], select: nil]"
--
--   و همان متن برای columns و cards هم تکرار می‌شود. یعنی این جدول‌ها در
--   publication به نام `supabase_realtime` عضو نیستند.
--
--   آزمون تکمیلی روی WebSocket خام: نوشتن واقعی (INSERT کارت با پاسخ 201) و
--   ۱۵ ثانیه انتظار ⇒ صفر رویداد. پس این مشکل شبکه یا کتابخانه نیست.
--
-- چرا این یک اشکال واقعی و نه یک جزئیات بی‌اهمیت است:
--
--   `useBoardRealtime` به کانال cards و columns گوش می‌دهد تا دو کلاینتِ هم‌زمان
--   (مثلاً کشیدن کارت در یک تب و دیدن نتیجه در تب دیگر) همگام بمانند. تا وقتی
--   این دو جدول در publication نباشند، آن hook هرگز یک رویداد نمی‌گیرد و
--   همگام‌سازی بین‌مرورگری کاملاً بی‌اثر است — بی‌آنکه خطایی هم دیده شود، چون
--   لایه‌ی UI فکر می‌کند اتصال «live» است.
--
-- چه چیزی عمداً دست‌نخورده می‌ماند:
--
--   `replica identity` روی DEFAULT می‌ماند. با DEFAULT، رکورد DELETE در WAL
--   فقط کلید اصلی دارد، و `useBoardRealtime` دقیقاً بر همین اساس نوشته شده
--   (به‌جای فیلتر server-side که در DELETE قابل ارزیابی نبود، مالکیت را
--   سمت کلاینت و از روی کش می‌سنجد). گذاشتن `full` کل بدنه‌ی سطر را در WAL
--   می‌نویسد و با طراحی فعلی ناسازگار است.
--
-- این اسکریپت idempotent است: اجرای دوباره‌ی آن خطا نمی‌دهد و چیزی را
-- دوباره اضافه نمی‌کند. اگر publication اصلاً وجود نداشته باشد (مثلاً
-- Postgres خودمدیریت‌شده بدون Realtime) هشدار می‌دهد و رد می‌شود، چون در آن
-- حالت ساختن publication چیزی را درست نمی‌کند.
-- ============================================================================
do $$
declare
  v_pub  constant text := 'supabase_realtime';
  v_tbl  text;
  v_qual text;
begin
  if not exists (select 1 from pg_publication where pubname = v_pub) then
    raise warning
      'publication "%" does not exist on this database. Realtime cannot be enabled here. Skipping.',
      v_pub;
    return;
  end if;

  foreach v_qual in array array['public.boards', 'public.columns', 'public.cards'] loop
    v_tbl := split_part(v_qual, '.', 2);

    if exists (
      select 1
        from pg_publication_tables
       where pubname    = v_pub
         and schemaname = split_part(v_qual, '.', 1)
         and tablename  = v_tbl
    ) then
      raise notice '% already in publication "%" (left unchanged).', v_qual, v_pub;
    else
      -- اگر جدول اصلاً وجود نداشته باشد، ADD TABLE خطا می‌دهد؛ آن خطا عمداً
      -- بالا می‌رود تا اجرای migration متوقف شود، نه اینکه بی‌صدا رد شود.
      execute format('alter publication %I add table %s', v_pub, v_qual);
      raise notice '% added to publication "%".', v_qual, v_pub;
    end if;
  end loop;
end $$;
