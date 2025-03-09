import { createClient } from '@/utils/supabase/server';
import { DashboardProvider } from '@/context/DashboardContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get the user server-side
  const supabase = await createClient();
  
  // Get user from Supabase
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  
  if (!user) {
    redirect('/auth/login');
  }
  
  return (
    <DashboardProvider user={user}>
      <div className="min-h-screen bg-gray-900 pt-4 md:pt-6">
        <div className="flex h-[calc(100vh-1.5rem)]">
          <Sidebar />
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
} 