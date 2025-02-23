import { createClient } from '@/lib/supabase-server'
import DashboardContent from '@/components/DashboardContent'

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null // Handle this case in the middleware
  }

  return <DashboardContent user={user} />
} 