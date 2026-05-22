import Sidebar from "@/components/shared/Sidebar"
import Header from "@/components/shared/Header"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-y-auto">
        <Header />
        <div className="p-10 space-y-8">
          {children}
        </div>
      </main>
    </div>
  )
}