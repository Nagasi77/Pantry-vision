'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { supabase } from '../../lib/supabase'
import {
  Activity,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2,
  PackageSearch
} from 'lucide-react'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    total: 0,
    aman: 0,
    restok: 0,
    scan: 0,
    restokName: '-'
  })
  const [inventory, setInventory] = useState<any[]>([])
  const [sensorRealtime, setSensorRealtime] = useState({
    berat: 0,
    gas: 'Normal',
    jarak: 0
  })

  // Gunakan useCallback agar fungsi stabil dan bisa dipanggil di useEffect
  const fetchDashboardData = useCallback(async (userId: string) => {
    try {
      setLoading(true)
      
      // 1. Ambil Data Pantry
      const { data: items, error: pantryError } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (pantryError) throw pantryError

      // 2. Ambil Data History Scan
      const { count: scanCount, error: scanError } = await supabase
        .from('sensor_data')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)

      if (scanError) throw scanError

      if (items) {
        setInventory(items.slice(0, 5))
        const restokItems = items.filter(item => item.quantity <= 2)

        setStats({
          total: items.length,
          aman: items.length - restokItems.length,
          restok: restokItems.length,
          scan: scanCount || 0,
          restokName: restokItems.length > 0 ? restokItems[0].name : '-'
        })
      }
    } catch (error: any) {
      // Perbaikan log error agar pesan terlihat jelas
      console.error("Gagal mengambil data detail:", error.message || error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Pastikan session dan user ID benar-benar sudah ada
    if (status === "authenticated" && session?.user?.id) {
      const userId = session.user.id
      
      fetchDashboardData(userId)

      const channel = supabase
        .channel('sensor_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'sensor_data',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            setSensorRealtime({
              berat: payload.new.berat,
              gas: payload.new.gas,
              jarak: payload.new.jarak
            })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [session, status, fetchDashboardData])

  // Tampilan Loading
  if (status === "loading" || (loading && inventory.length === 0)) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Memuat PantryVision...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* STATS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Bahan" value={stats.total} icon={ShoppingBag} valueColor="text-green-600" />
        <StatCard label="Stok Aman" value={stats.aman} subLabel={`DARI ${stats.total} ITEM`} icon={CheckCircle2} valueColor="text-green-600" />
        <StatCard label="Perlu Restok" value={stats.restok} subLabel={stats.restokName} icon={AlertCircle} valueColor="text-orange-500" />
        <StatCard label="Total Scan" value={stats.scan} subLabel="HISTORY ALAT" icon={Activity} valueColor="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* INVENTORI DAPUR */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Inventori Dapur</h3>
            <Link href="/inventori" className="text-[10px] font-bold text-green-600 flex items-center gap-1 uppercase tracking-widest group">
              Lihat Semua <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>

          <div className="space-y-4">
            {inventory.length > 0 ? (
              inventory.map((item) => (
                <InventoryItem
                  key={item.id}
                  icon={item.icon || "📦"}
                  name={item.name}
                  qty={`${item.quantity} pcs`}
                  detail={`${item.weight || 0}g • ${item.calories || 0} kkal`}
                  color={item.quantity <= 2 ? "bg-yellow-400" : "bg-green-500"}
                  percentage={item.quantity > 5 ? "w-full" : "w-[40%]"}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <PackageSearch size={48} strokeWidth={1} />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest">Belum ada bahan</p>
              </div>
            )}
          </div>
        </div>

        {/* SENSOR REAL-TIME CARD */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[450px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[80px]" />
          <div className="relative z-10">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              Live Monitoring
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-8 text-center">
              <SensorCard label="Berat" val={`${sensorRealtime.berat}g`} />
              <SensorCard
                label="Gas"
                val={sensorRealtime.gas}
                valColor={sensorRealtime.gas === 'Normal' ? "text-green-400" : "text-red-400"}
              />
              <SensorCard label="Jarak" val={`${sensorRealtime.jarak}cm`} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-7 rounded-3xl border border-white/10 shadow-inner relative z-10 transition-all">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                {sensorRealtime.berat > 0 ? "🍓" : "📭"}
              </div>
              <div className="text-left">
                <p className="font-black text-lg text-white leading-none mb-1.5 tracking-tight">
                  {sensorRealtime.berat > 0 ? `${sensorRealtime.berat}g Terdeteksi` : "Siap Memindai"}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {sensorRealtime.berat > 0 ? "Alat sedang menimbang bahan" : "Letakkan bahan di atas alat"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- SUB-COMPONENTS (Sama Seperti Sebelumnya) ---
function StatCard({ label, value, subLabel, valueColor }: any) {
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
        <div>
          <p className="font-black text-slate-800 leading-none mb-1">{name}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{detail}</p>
        </div>
      </div>
      <div className="flex-1 max-w-[120px] mx-8 hidden sm:block">
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full ${color} ${percentage} rounded-full transition-all duration-1000`}></div>
        </div>
      </div>
      <div className="px-4 py-1.5 bg-white rounded-lg text-xs font-black shadow-sm border border-slate-50 text-slate-700">{qty}</div>
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