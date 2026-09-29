import { LABEL_COLORS } from '@/lib/labelColors'

/** هش ساده و پایدار از id؛ هر بورد همیشه یک رنگ ثابت دارد */
export function hashOf(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

export function boardColor(id: string): string {
  return LABEL_COLORS[hashOf(id) % LABEL_COLORS.length].value
}

/** حرف اول عنوان برای نشان بورد */
export function boardInitial(title: string): string {
  return Array.from(title.trim())[0] ?? '؟'
}