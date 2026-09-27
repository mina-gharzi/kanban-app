/**
 * دفترچه‌ی «نوشتن‌های در جریان» برای هر بورد.
 *
 * دو مسئله را حل می‌کند که در Optimistic Update به هم گره خورده‌اند:
 *
 * ۱) ترتیب نوشتن‌ها — دو Drag پشت سر هم نباید هم‌زمان به سرور برسند،
 *    وگرنه درخواست دوم ممکن است زودتر از اولی ثبت شود و ترتیب را خراب کند.
 *    کارهای وابسته (reorder) در یک صف به ترتیب اجرا می‌شوند.
 *
 * ۲) هماهنگی با Realtime — تا وقتی یک نوشتن خوش‌بینانه در جریان است،
 *    رویداد realtime نباید همان رکورد را در کش بازنویسی کند، وگرنه
 *    مقدار پیش‌بینی‌شده‌ی ما با مقدار کهنه‌ی سرور عوض می‌شود.
 *
 * این ماژول فقط state محلی و بی‌ارتباط با React دارد؛ نه store سرور است
 * و نه در cache تکرار می‌شود.
 */

/**
 * کلید ردیابی «در این scope یک رکورد در حال ساخت است».
 *
 * تا وقتی create در جریان است، رویداد INSERT مربوط به آن نادیده گرفته
 * می‌شود تا رکورد موقت و رکورد واقعی دوبار در کش ننشینند؛ جایگزینی موقت با
 * پاسخ سرور کارِ خودِ mutation است.
 *
 * scope بسته به نوع رکورد فرق دارد، چون رویداد INSERT شناسه‌ی واقعی را
 * دارد و شناسه‌ی موقت ما را ندارد:
 *   - card   → بر اساس columnId (رویداد INSERT، column_id واقعی را دارد)
 *   - column → بر اساس boardId (ستون جدید متعلق به همین بورد است)
 *
 * برای همین کلید با نوع تفکیک می‌شود تا شناسه‌ی یک ستون با شناسه‌ی یک بورد
 * اشتباه گرفته نشود.
 */
export function pendingCreateKey(
  kind: 'card' | 'column',
  scopeId: string
): string {
  return `pending-create:${kind}:${scopeId}`
}

/** صف نوشتن‌های ترتیبی به تفکیک scope (boardId). */
const writeQueues = new Map<string, Promise<void>>()

/** scope → شناسه → تعداد نوشتن‌های باز روی آن شناسه. */
const inFlightWrites = new Map<string, Map<string, number>>()

/**
 * اجرای کار به ترتیب، پشت سر کارهای قبلی همان scope.
 * شکست یک کار، صف را نمی‌شکند؛ کار بعدی اجرا می‌شود.
 */
export function runSerialized<T>(
  scope: string,
  task: () => Promise<T>
): Promise<T> {
  const previous = writeQueues.get(scope) ?? Promise.resolve()
  const result = previous.then(task)

  // tail عمداً هرگز reject نمی‌شود تا یک خطا، صف را برای بقیه نبندد
  const tail = result.then(
    () => undefined,
    () => undefined
  )
  writeQueues.set(scope, tail)
  void tail.then(() => {
    // پاک‌سازی تا صف بی‌نهاومند رشد نکند
    if (writeQueues.get(scope) === tail) writeQueues.delete(scope)
  })

  return result
}

/**
 * اعلام اینکه روی این شناسه‌ها نوشتن خوش‌بینانه در جریان است.
 * تابع آزادسازی برمی‌گرداند و دقیقاً یک‌بار (یا بیشتر برای نوشتن‌های تودرتو)
 * باید صدا زده شود — معمولاً در `onSettled`.
 */
export function trackOptimisticWrites(
  scope: string,
  ids: readonly string[]
): () => void {
  let byId = inFlightWrites.get(scope)
  if (!byId) {
    byId = new Map<string, number>()
    inFlightWrites.set(scope, byId)
  }
  for (const id of ids) {
    byId.set(id, (byId.get(id) ?? 0) + 1)
  }

  let released = false
  return () => {
    if (released) return
    released = true
    const current = inFlightWrites.get(scope)
    if (!current) return
    for (const id of ids) {
      const count = current.get(id)
      if (count === undefined) continue
      if (count <= 1) {
        current.delete(id)
      } else {
        current.set(id, count - 1)
      }
    }
    if (current.size === 0) inFlightWrites.delete(scope)
  }
}

/** آیا هر کدام از این شناسه‌ها نوشتن در جریان دارد؟ */
export function hasOptimisticWrite(
  scope: string,
  ids: readonly string[]
): boolean {
  const byId = inFlightWrites.get(scope)
  if (!byId) return false
  return ids.some((id) => byId.has(id))
}

/** فقط برای تست: وضعیت داخلی نباید بین تست‌ها نشت کند. */
export function resetOptimisticTracking(): void {
  writeQueues.clear()
  inFlightWrites.clear()
}
