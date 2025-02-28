import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/context/AuthProvider'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Toaster } from '@/components/ui/sonner'
import { DebugLayout } from './debug-layout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'LifeGuide',
  description: 'Your Personal Guide to Life – Made by You',
  icons: {
    icon: '/logo.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-gray-900 flex flex-col">
        <AuthProvider>
          <DebugLayout>
            <Navbar />
            <main className="flex-1">
              {children}
            </main>
            <Footer />
            <Toaster />
          </DebugLayout>
        </AuthProvider>
      </body>
    </html>
  )
}
