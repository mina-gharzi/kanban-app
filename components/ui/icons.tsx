import type { SVGProps } from 'react'

/**
 * آیکون‌ها به‌صورت inline SVG و بدون هیچ dependency جدید.
 * همه `currentColor` می‌گیرند تا رنگشان از متن والد ارث ببرند و در
 * Light/Dark نیازی به رنگ hard-code نداشته باشند.
 *
 * آیکون‌های تزئینی‌اند و همیشه `aria-hidden` هستند؛ برچسب دسترس‌پذیری
 * روی دکمه‌ی حاوی‌شان قرار می‌گیرد، نه روی خود آیکون.
 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number }

function Icon({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  )
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function XIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M18 6 6 18M6 6l12 12" />
    </Icon>
  )
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m20 6-11 11-5-5" />
    </Icon>
  )
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Icon>
  )
}

export function AlertCircleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4.5M12 16h.01" />
    </Icon>
  )
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10.3 4.3 2.6 17.5A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.5L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 16.5h.01" />
    </Icon>
  )
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </Icon>
  )
}

export function TrashIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M10 11v6M14 11v6" />
      <path d="M6 7l1 12.2A1.8 1.8 0 0 0 8.8 21h6.4a1.8 1.8 0 0 0 1.8-1.8L18 7" />
      <path d="M9 7V5a1.8 1.8 0 0 1 1.8-1.8h2.4A1.8 1.8 0 0 1 15 5v2" />
    </Icon>
  )
}

export function DotsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="5.5" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="18.5" r="1.25" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function GripIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 9 6 6 6-6" />
    </Icon>
  )
}

export function SunIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
    </Icon>
  )
}

export function MoonIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />
    </Icon>
  )
}

export function BoardsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3" y="4" width="7" height="16" rx="1.6" />
      <rect x="14" y="4" width="7" height="10" rx="1.6" />
    </Icon>
  )
}

export function LogOutIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M15 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-2" />
      <path d="M10 12h11m-3-3 3 3-3 3" />
    </Icon>
  )
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Icon>
  )
}

export function ColumnIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
      <rect x="10.5" y="4" width="5" height="16" rx="1.5" />
      <path d="M17.5 8v8" />
    </Icon>
  )
}

export function CardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h5" />
    </Icon>
  )
}

export function PencilIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 6.5 3 3" />
    </Icon>
  )
}

export function InboxIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
      <path d="M5.6 5.5 4 13v4.5A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5V13l-1.6-7.5A2.5 2.5 0 0 0 16 4H8a2.5 2.5 0 0 0-2.4 1.5Z" />
    </Icon>
  )
}

export function SearchOffIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5M8.5 8.5l5 5m0-5-5 5" />
    </Icon>
  )
}

export function LiveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.5a8.5 8.5 0 0 1 8.5 8.5" />
      <path d="M12 7.5a4.5 4.5 0 0 1 4.5 4.5" />
      <circle cx="12" cy="16" r="1.6" fill="currentColor" stroke="none" />
    </Icon>
  )
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  )
}

export function RefreshIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M20 11a8 8 0 1 0-.6 4" />
      <path d="M20 5v6h-6" />
    </Icon>
  )
}

export function ShieldIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 3.2 5 6v5.5c0 4 2.9 7.6 7 9.3 4.1-1.7 7-5.3 7-9.3V6l-7-2.8Z" />
    </Icon>
  )
}

export function UsersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="8" r="3.25" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.6-3.38" />
      <path d="M15.5 4.9a3.25 3.25 0 0 1 0 6.2" />
    </Icon>
  )
}

export function UserIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </Icon>
  )
}
