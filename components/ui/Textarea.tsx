import type { TextareaHTMLAttributes } from 'react'

type Props = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  'className' | 'aria-invalid'
> & {
  invalid?: boolean
  className?: string
}

export default function Textarea({
  invalid = false,
  className = '',
  rows = 5,
  ...props
}: Props) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={[
        'w-full resize-none rounded-md border bg-surface px-3 py-2 text-body',
        'text-text placeholder:text-text-muted transition-colors duration-150',
        // مثل Input: حلقهٔ فوکوس از `:focus-visible` سراسری می‌آید.
        'focus:border-primary',
        invalid
          ? 'border-danger focus:border-danger'
          : 'border-border-input hover:border-text-2',
        'disabled:bg-surface-2 disabled:text-text-muted disabled:opacity-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
