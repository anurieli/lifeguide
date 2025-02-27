export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-900 pt-16 md:pt-20">
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  );
} 