import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Boxy IDE',
  description: 'A modern web-based IDE',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="dark">
        {children}
      </body>
    </html>
  )
} 