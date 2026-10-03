import type { InputHTMLAttributes, ReactNode, Ref } from 'react'

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'size' | 'className' | 'aria-invalid'
> & {
  invalid?: boolean
  size?: 'sm' | 'md'
  /** آیکون سمت راست (در RTL «شروع» فیلد) */
  leading?: ReactNode
  /** آیکون سمت چپ، مثل دکمه‌ی پاک‌کردن */
  trailing?: ReactNode
  className?: string
  ref?: Ref<HTMLInputElement>
}

export default function Input({
  invalid = false,
  size = 'md',
  leading,
  trailing,
  className = '',
  ...props
}: Props) {
  const control = (
    <input
      aria-invalid={invalid || undefined}
      className={[
        'w-full min-w-0 bg-surface text-text placeholder:text-text-muted',
        'border rounded-md transition-colors duration-150',
        // عمداً `outline-none` نداریم: حلقهٔ فوکوس یکدست `:focus-visible`
        // در globals.css است. حذفش با ring ۲۵٪-opacity که جایگزین می‌شد،
        // فوکوس را در تم تاریک عملاً نامرئی می‌کرد.
        'focus:border-primary',
        invalid
          ? 'border-danger focus:border-danger'
          : 'border-border-input hover:border-text-2',
        size === 'sm' ? 'h-9 px-2.5 text-meta' : 'h-10 px-3 text-body',
        leading ? 'pe-9' : '',
        trailing ? 'ps-9' : '',
        'disabled:bg-surface-2 disabled:text-text-muted disabled:opacity-100',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    />
  )

  if (!leading && !trailing) return control

  return (
    <div className="relative">
      {control}
      {leading && (
        <span className="pointer-events-none absolute inset-y-0 end-0 flex w-9 items-center justify-center text-text-muted">
          {leading}
        </span>
      )}
      {trailing && (
        <span className="absolute inset-y-0 start-0 flex w-9 items-center justify-center text-text-muted">
          {trailing}
        </span>
      )}
    </div>
  )
}
