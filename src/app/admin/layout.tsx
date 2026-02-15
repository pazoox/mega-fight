import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 flex">
      <AdminSidebar />
      <div className="flex-1 ml-64">
        <main className="p-4 w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
