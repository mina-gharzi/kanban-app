export function getDueDateStatus(dueDate: string | null): 'overdue' | 'soon' | 'normal' | null {
  if (!dueDate) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'overdue'
  if (diffDays <= 2) return 'soon' // امروز، فردا، پس‌فردا
  return 'normal'
}

export function formatDueDate(dueDate: string): string {
  return new Date(dueDate).toLocaleDateString('fa-IR', {
    month: 'short',
    day: 'numeric',
  })
}