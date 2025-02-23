import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerComponentClient({ cookies })
  
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <nav className="flex items-center space-x-4 lg:space-x-6">
            <a href="/dashboard" className="text-sm font-medium transition-colors hover:text-primary">
              Dashboard
            </a>
            <a href="/dashboard/blueprint" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
              Blueprint
            </a>
          </nav>
          <div className="ml-auto flex items-center space-x-4">
            <form action="/auth/signout" method="post">
              <button type="submit" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      <footer className="border-t py-6">
        <div className="container flex items-center justify-between">
          <p className="text-sm text-muted-foreground">© 2024 LifeGuide. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
} 