import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/utils/AuthProvider'
import Navbar from '@/components/navbar'
import Footer from '@/components/footer'
import { Toaster } from '@/components/ui/sonner'
import MobileBanner from '@/components/MobileBanner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Lifeguide',
  description: 'Your Personal Guide to Life – Made by You',
  icons: {
    icon: 'favicon.ico',
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
            <Navbar />
            <MobileBanner />
            <main className="flex-1 pb-20 md:pb-0 pt-28">
              {children}
            </main>
            <Footer className="pb-16 md:pb-0" />
            <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
