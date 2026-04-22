'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Package, Activity, Scan, 
  History, User, LogOut, ChevronDown 
} from 'lucide-react'

export default function DashboardPage() {
  const pathname = usePathname()
  const router = useRouter()

  const navItemStyle = (path: string) => 
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
      pathname === path 
      ? "bg-green-600 text-white shadow-lg shadow-green-100 translate-x-1" 
      : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
    }`

  const [sensorRealtime, setSensorRealtime] = useState({
    berat: 150,
    gas: 'Normal',
    jarak: 8
  })

  useEffect(() => {
    const ambilDataIoT = async () => {
    }
    ambilDataIoT()
  }, [])

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* ── SIDEBAR── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen shadow-sm z-20">
        {/* Logo Section */}
        <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Pantry Vision</span>
        </div>
        
          {/* ── Navigation Section ── */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            <p className="px-4 text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Menu Utama</p>
            
            <Link href="/dashboard" className={navItemStyle('/dashboard')}>
              <LayoutDashboard size={20}/> 
              <span className="font-bold text-sm tracking-tight">Dashboard</span>
            </Link>
            
            <Link href="/inventori" className={navItemStyle('/inventori')}>
              <Package size={20}/> 
              <span className="font-bold text-sm tracking-tight">Inventori</span>
            </Link>
            
            <Link href="/sensor" className={navItemStyle('/sensor')}>
              <Activity size={20}/> 
              <span className="font-bold text-sm tracking-tight">Sensor</span>
            </Link>
            
            <Link href="/scan" className={navItemStyle('/scan')}>
              <Scan size={20}/> 
              <span className="font-bold text-sm tracking-tight">Scan</span>
            </Link>
            
            <Link href="/riwayat" className={navItemStyle('/riwayat')}>
              <History size={20}/> 
              <span className="font-bold text-sm tracking-tight">Riwayat Scan</span>
            </Link>
            
            <div className="pt-4 border-t border-slate-50 mt-3">
              <p className="px-4 text-[10px] font-black text-slate-400 mb-1 uppercase tracking-[0.2em]">Akun</p>
              <Link href="/profile" className={navItemStyle('/profile')}>
                <User size={20}/> 
                <span className="font-bold text-sm tracking-tight">Profile</span>
              </Link>
            </div>
          </nav>
        </aside>

      <main className="flex-1 flex flex-col">
        
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-medium">Dashboard</h2>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">👤</div>
        </header>

        <div className="p-8 space-y-6">
          
          <div className="grid grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Total bahan</p>
              <p className="text-4xl font-bold">10</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Stok aman</p>
              <p className="text-4xl font-bold">9</p>
              <p className="text-xs text-gray-400 mt-1">dari 10 item</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Perlu restok</p>
              <p className="text-4xl font-bold">1</p>
              <p className="text-xs text-gray-400 mt-1">pisang</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
              <p className="text-sm text-gray-500 mb-2">Scan hari ini</p>
              <p className="text-4xl font-bold">5</p>
              <p className="text-xs text-gray-400 mt-1">total scan</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            
            <div className="col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="font-medium mb-6">Inventori dapur</h3>
              <div className="space-y-4">
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-xl">🍎</div>
                    <div>
                      <p className="font-medium leading-none mb-1">Apel</p>
                      <p className="text-xs text-gray-500">150 g. 52 kkal</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[150px] mx-8">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 w-full"></div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gray-200 rounded-lg text-xs font-bold">5 pcs</div>
                </div>


                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center text-xl">🍌</div>
                    <div>
                      <p className="font-medium leading-none mb-1">Pisang</p>
                      <p className="text-xs text-gray-500">120 g. 89 kkal</p>
                    </div>
                  </div>
                  <div className="flex-1 max-w-[150px] mx-8">
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 w-2/5"></div>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-gray-200 rounded-lg text-xs font-bold">2 pcs</div>
                </div>

              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
              <h3 className="font-medium mb-6">Sensor real-time</h3>
              
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Berat</p>
                  <p className="font-medium">{sensorRealtime.berat} g</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Gas</p>
                  <p className="font-medium">{sensorRealtime.gas}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-100 text-center">
                  <p className="text-xs text-gray-500 mb-1">Jarak</p>
                  <p className="font-medium">{sensorRealtime.jarak} cm</p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-100">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl shrink-0">🍎</div>
                  <div>
                    <p className="font-bold text-sm mb-1">Apel - 150 g</p>
                    <p className="text-xs text-gray-600 mb-2">52 kkal, C:13.8g, P:0.3g, L:0.2g</p>
                    <p className="text-[10px] text-gray-500 leading-tight">Saran menu: Pie apel, Salad buah</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  )
}