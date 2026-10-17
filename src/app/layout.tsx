import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Radiant Hospitals HMS — Next-Gen Healthcare Management',
  description:
    'High-performance hospital management system powered by Next.js, PostgreSQL, and Prisma. Manage patients, appointments, doctors, and clinical records seamlessly.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
