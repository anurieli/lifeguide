import { createClient } from '@/utils/supabase/server';
import { DashboardProvider } from '@/context/DashboardContext';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { MobileDashboardNavbar } from '@/components/dashboard/MobileDashboardNavbar';
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
      <div className="dashboard min-h-screen bg-gray-900 flex flex-col">
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <Sidebar />
          
          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {/* Mobile Dashboard Navbar */}
            <MobileDashboardNavbar />
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-auto p-4">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardProvider>
  );
} 