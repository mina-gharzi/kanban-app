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
        'w-full resize-none rounded-md border bg-surface px-3 py-2 text-sm',
        'text-text placeholder:text-text-muted transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary',
        invalid
          ? 'border-danger focus:border-danger focus:ring-danger/25'
          : 'border-border hover:border-border-2',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )
}
