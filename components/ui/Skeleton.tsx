type Props = {
  className?: string
}

/** بلوک اسکلت. ارتفاع/عرض از `className` می‌آید تا بدون utility اضافه بماند. */
export default function Skeleton({ className = '' }: Props) {
  return <div aria-hidden="true" className={`skeleton rounded-md ${className}`} />
}

/** اسکلت لیست کارت‌ها داخل یک ستون (برای زمانی که فقط یک ستون لود می‌شود). */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="rounded-lg border border-border bg-surface p-3">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="mt-2 h-3 w-full" />
          {index % 2 === 0 && <Skeleton className="mt-2 h-3 w-1/3" />}
        </div>
      ))}
    </div>
  )
}
