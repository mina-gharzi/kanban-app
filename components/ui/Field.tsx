import type { ReactNode } from 'react'

type FieldRenderProps = {
  id: string
  describedBy: string | undefined
  invalid: boolean
}

type Props = {
  /** برای اتصال `id` به کنترل و `htmlFor` به label */
  id: string
  label: string
  /** خطای اعتبارسنجی؛ کنار فیلد نمایش داده می‌شود، نه به‌صورت toast */
  error?: string | null
  hint?: string
  required?: boolean
  className?: string
  children: (props: FieldRenderProps) => ReactNode
}

/**
 * پوسته‌ی فیلد: label + کنترل + پیام خطا.
 *
 * اتصال `id` / `aria-describedby` / `aria-invalid` اینجا انجام می‌شود تا
 * هیچ فرمی مجبور نباشد این سه تا را دستی و ناسازگاه تکرار کند.
 */
export default function Field({
  id,
  label,
  error,
  hint,
  required = false,
  className = '',
  children,
}: Props) {
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const describedBy = error ? errorId : hint ? hintId : undefined

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-meta font-medium text-text-2"
      >
        {label}
        {required && (
          <span className="text-danger ms-1" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children({ id, describedBy, invalid: Boolean(error) })}

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-1.5 flex items-center gap-1.5 text-meta text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-meta text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
