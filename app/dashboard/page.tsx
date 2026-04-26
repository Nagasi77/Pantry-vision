'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  LayoutDashboard, Package, Activity, Scan, 
  History, User, LogOut, ChevronDown, ChevronRight, Bell,
  ShoppingBag, CheckCircle2, AlertCircle 
} from 'lucide-react'

export default function DashboardPage() {
  const pathname = usePathname()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [sensorRealtime] = useState({ berat: 150, gas: 'Normal', jarak: 8 })
  const [user] = useState({ fullname: "Muhammad Dimas Ajie", email: "mahasiswa123@gmail.com" })
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => router.push("/login")
  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  const navItemStyle = (path: string) => 
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
      pathname === path 
      ? "bg-green-600 text-white shadow-lg shadow-green-100 translate-x-1" 
      : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
    }`

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans overflow-hidden">
      
      {/* ── SIDEBAR ── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen shadow-sm z-20">
        <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tight text-slate-800">Pantry Vision</span>
        </div>
        
          <p className="px-4 text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Menu Utama</p>
          <Link href="/dashboard" className={navItemStyle('/dashboard')}>
            <LayoutDashboard size={20}/> <span className="font-bold text-sm tracking-tight">Dashboard</span>
          </Link>
          <Link href="/inventori" className={navItemStyle('/inventori')}>
            <Package size={20}/> <span className="font-bold text-sm tracking-tight">Inventori</span>
          </Link>
          <Link href="/sensor" className={navItemStyle('/sensor')}>
            <Activity size={20}/> <span className="font-bold text-sm tracking-tight">Sensor</span>
          </Link>
          <Link href="/scan" className={navItemStyle('/scan')}>
            <Scan size={20}/> <span className="font-bold text-sm tracking-tight">Scan</span>
          </Link>
          <Link href="/riwayat" className={navItemStyle('/riwayat')}>
            <History size={20}/> <span className="font-bold text-sm tracking-tight">Riwayat Scan</span>
          </Link>
          
          <div className="pt-8 border-t border-slate-50 mt-4">
            <p className="px-4 text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em]">Akun</p>
            <Link href="/profile" className={navItemStyle('/profile')}>
              <User size={20}/> <span className="font-bold text-sm tracking-tight">Profile</span>
            </Link>
          </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between px-10">
          <h2 className="text-xl font-black text-slate-800 tracking-tighter">Dashboard</h2>
          
          <div className="relative" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="p-1 rounded-xl bg-slate-50 border border-slate-100 hover:bg-white transition-all">
              <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-lg flex items-center justify-center text-xs uppercase shadow-sm">
                {getInitial(user.fullname)}
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
                  <div className="w-12 h-12 bg-green-100 text-green-700 font-black rounded-2xl border-2 border-white flex items-center justify-center text-lg shadow-sm mb-3 uppercase">
                    {getInitial(user.fullname)}
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Akun Aktif</p>
                  <p className="text-sm font-black text-slate-800 truncate w-full">{user.fullname}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate w-full">{user.email}</p>
                </div>
                <div className="px-2">
                  <button onClick={handleLogout} className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] group">
                    <LogOut size={14} className="text-red-400 group-hover:text-red-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-10 space-y-8">
          {/* STATS SECTION */}
          <div className="grid grid-cols-4 gap-6">
            <StatCard 
              label="Total Bahan" 
              value="10" 
              icon={ShoppingBag} 
              color="bg-green-500" 
              valueColor="text-green-600" 
            />
            <StatCard 
              label="Stok Aman" 
              value="9" 
              subLabel="DARI 10 ITEM" 
              icon={CheckCircle2} 
              color="bg-green-500" 
              valueColor="text-green-600" 
            />
            <StatCard 
              label="Perlu Restok" 
              value="1" 
              subLabel="PISANG" 
              icon={AlertCircle} 
              color="bg-orange-500" 
              valueColor="text-orange-500" 
            />
            <StatCard 
              label="Scan Hari Ini" 
              value="5" 
              subLabel="TOTAL SCAN" 
              icon={Activity} 
              color="bg-blue-500" 
              valueColor="text-blue-600" 
            />
          </div>

          <div className="grid grid-cols-3 gap-8 items-start">
            {/* INVENTORI DAPUR */}
            <div className="col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Inventori Dapur</h3>
                <Link href="/inventori" className="text-[10px] font-bold text-green-600 flex items-center gap-1 uppercase tracking-widest group">
                  Lihat Semua <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>

              <div className="space-y-4">
                {/* Logic stok bar: Apel full (100%), Pisang sedikit (30%) */}
                <InventoryItem icon="🍎" name="Apel" qty="5 pcs" detail="150g • 52 kkal" color="bg-green-500" percentage="w-full" />
                <InventoryItem icon="🍌" name="Pisang" qty="2 pcs" detail="120g • 89 kkal" color="bg-yellow-400" percentage="w-[30%]" />
              </div>
            </div>

            {/* SENSOR REAL-TIME */}
            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[420px]">
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[80px]" />
              <div className="relative z-10 text-left">
                <div className="flex items-center mb-8">
                  <h3 className="text-lg font-black tracking-tight flex items-center gap-3">
                    <div className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
                    </div>
                    Sensor Real-time
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-8 text-center text-left">
                  <SensorCard label="Berat" val={`${sensorRealtime.berat}g`} />
                  <SensorCard label="Gas" val={sensorRealtime.gas} valColor="text-green-400" />
                  <SensorCard label="Jarak" val={`${sensorRealtime.jarak}cm`} />
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl p-7 rounded-3xl border border-white/10 shadow-inner relative z-10">
                <div className="flex gap-4 items-center">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">🍎</div>
                  <div className="text-left">
                    <p className="font-black text-lg text-white leading-none mb-1.5 tracking-tight">Apel - {sensorRealtime.berat}g</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">52 kkal • C:13.8g • P:0.3g</p>
                    <div className="pt-3 border-t border-white/5">
                      <p className="text-[10px] text-green-400 font-black uppercase tracking-tighter">Saran: Pie apel, Salad buah</p>
                    </div>
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

// ── REUSABLE MINI COMPONENTS ──

function StatCard({ label, value, subLabel, valueColor = "text-slate-800" }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center transition-all hover:scale-[1.03] duration-300">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">{label}</p>
      <p className={`text-4xl font-black tracking-tighter leading-none ${valueColor}`}>{value}</p>
      {subLabel && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{subLabel}</p>}
    </div>
  )
}

function InventoryItem({ icon, name, qty, detail, color, percentage }: any) {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-50">{icon}</div>
        <div className="text-left">
          <p className="font-black text-slate-800 leading-none mb-1">{name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{detail}</p>
        </div>
      </div>
      <div className="flex-1 max-w-[150px] mx-8">
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          {/* Prop percentage digunakan di sini untuk mengatur panjang bar */}
          <div className={`h-full ${color} ${percentage} rounded-full transition-all duration-1000`}></div>
        </div>
      </div>
      <div className="px-4 py-1.5 bg-white rounded-lg text-xs font-black shadow-sm border border-slate-50 text-slate-700">
        {qty}
      </div>
    </div>
  )
}

function SensorCard({ label, val, valColor = "text-white" }: any) {
  return (
    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5">
      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-tighter">{label}</p>
      <p className={`font-black text-sm ${valColor}`}>{val}</p>
    </div>
  )
}