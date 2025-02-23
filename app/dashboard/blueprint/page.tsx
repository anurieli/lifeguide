import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'

export default async function BlueprintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Your Blueprint</h1>
        <p className="text-muted-foreground">
          View and manage your personal Life Blueprint.
        </p>
      </div>

      <div className="grid gap-4">
        <div className="p-6 bg-card rounded-lg border">
          <h2 className="text-xl font-semibold mb-4">Blueprint Content</h2>
          <p className="text-muted-foreground">
            Your blueprint content will be displayed here.
          </p>
        </div>
      </div>
    </div>
  )
} 