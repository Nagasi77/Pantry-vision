'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Package, Activity, Scan, History, User } from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()

  const navItemStyle = (path: string) => 
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
      pathname === path 
      ? 'bg-green-600 text-white shadow-lg'
      : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
    }`

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen shadow-sm z-20">
      <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
        <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
          <Package className="text-white w-5 h-5" />
        </div>
        <span className="font-bold text-xl tracking-tight text-slate-800">Pantry Vision</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Menu Utama</p>
        <Link href="/dashboard" className={navItemStyle('/dashboard')}><LayoutDashboard size={20}/> <span>Dashboard</span></Link>
        <Link href="/inventori" className={navItemStyle('/inventori')}><Package size={20}/> <span>Inventori</span></Link>
        <Link href="/sensor" className={navItemStyle('/sensor')}><Activity size={20}/> <span>Sensor</span></Link>
        <Link href="/scan" className={navItemStyle('/scan')}><Scan size={20}/> <span>Scan</span></Link>
        <Link href="/riwayat" className={navItemStyle('/riwayat')}><History size={20}/> <span>Riwayat Scan</span></Link>

        <div className="pt-8 border-t border-slate-50 mt-4">
          <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Akun</p>
          <Link href="/profile" className={navItemStyle('/profile')}><User size={20} /> <span>Profile</span></Link>
        </div>
      </nav>
    </aside>
  )
}