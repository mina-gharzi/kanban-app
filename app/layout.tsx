import type { Metadata } from 'next'
import './globals.css'
import ToastContainer from '@/components/ToastContainer'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Kanban App',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa">
      <body>
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  )
}
