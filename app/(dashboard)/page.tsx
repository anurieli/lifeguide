import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export default async function Dashboard() {
  const supabase = createServerComponentClient({ cookies })
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back{user?.email ? `, ${user.email}` : ''}</h1>
        <p className="text-muted-foreground">Here's your personal Life Blueprint dashboard.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Blueprint Panel Placeholder */}
        <div className="col-span-2 p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Your Blueprint</h2>
          <p className="text-muted-foreground">Your blueprint content will appear here.</p>
        </div>

        {/* Customizable Cards Section */}
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Quick Insights</h2>
          <p className="text-muted-foreground">Your customizable cards will appear here.</p>
        </div>
      </div>
    </div>
  )
} 