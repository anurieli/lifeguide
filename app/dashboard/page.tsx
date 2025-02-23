import { createClient } from '@/lib/supabase-server'
import Link from 'next/link'

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null // Handle this case in the middleware
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back{user?.email ? `, ${user.email}` : ''}</h1>
        <p className="text-muted-foreground">Here&apos;s your personal Life Blueprint dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Blueprint Panel */}
        <div className="col-span-2 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Your Blueprint</h2>
          <p className="text-muted-foreground">Your blueprint content will appear here.</p>
          <div className="mt-4">
            <Link 
              href="/dashboard/blueprint"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              View Blueprint
            </Link>
          </div>
        </div>

        {/* Quick Insights */}
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Quick Insights</h2>
          <p className="text-muted-foreground">Your customizable cards will appear here.</p>
        </div>

        {/* How-To Guide */}
        <div className="col-span-2 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">How-To Guide</h2>
          <div className="prose prose-invert max-w-none">
            <h3>Getting Started</h3>
            <p>
              Welcome to your Life Blueprint dashboard! Here&apos;s how to get started:
            </p>
            <ol>
              <li>Visit the Blueprint section to view and edit your life blueprint</li>
              <li>Use the Quick Insights panel to track your progress</li>
              <li>Check the Settings page to customize your experience</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
} 