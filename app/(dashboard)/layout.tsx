import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import DashboardNav from '@/components/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <>
      <DashboardNav user={user} />
      <main className="container mx-auto p-8 pt-24">
        {children}
      </main>
    </>
  )
} 