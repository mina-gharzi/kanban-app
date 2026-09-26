import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <Link
        href="/board/aa9991ba-94e4-499d-b697-54fd1235cc86"
        className="bg-accent text-surface px-6 py-3 rounded-lg"
      >
        رفتن به بورد
      </Link>
    </div>
  )
}