import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lite IDE',
  description: 'A modern web-based IDE with file explorer, code editor, and terminal',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.svg" sizes="any" />
      </head>
      <body className="dark">
        {children}
      </body>
    </html>
  )
} 