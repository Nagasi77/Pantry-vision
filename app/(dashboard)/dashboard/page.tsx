'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Activity, ShoppingBag, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

export default function DashboardPage() {
  const [sensorRealtime] = useState({ berat: 150, gas: 'Normal', jarak: 8 })

  return (
    <>
      {/* STATS SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard label="Total Bahan" value="10" icon={ShoppingBag} valueColor="text-green-600" />
        <StatCard label="Stok Aman" value="9" subLabel="DARI 10 ITEM" icon={CheckCircle2} valueColor="text-green-600" />
        <StatCard label="Perlu Restok" value="1" subLabel="PISANG" icon={AlertCircle} valueColor="text-orange-500" />
        <StatCard label="Scan Hari Ini" value="5" subLabel="TOTAL SCAN" icon={Activity} valueColor="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* INVENTORI DAPUR */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">Inventori Dapur</h3>
            <Link href="/inventori" className="text-[10px] font-bold text-green-600 flex items-center gap-1 uppercase tracking-widest group">
              Lihat Semua <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
          <div className="space-y-4">
            <InventoryItem icon="🍎" name="Apel" qty="5 pcs" detail="150g • 52 kkal" color="bg-green-500" percentage="w-full" />
            <InventoryItem icon="🍌" name="Pisang" qty="2 pcs" detail="120g • 89 kkal" color="bg-yellow-400" percentage="w-[30%]" />
          </div>
        </div>

        {/* SENSOR REAL-TIME */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[420px]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-[80px]" />
          <div className="relative z-10 text-left">
            <h3 className="text-lg font-black tracking-tight flex items-center gap-3 mb-8">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
              </span>
              Sensor Real-time
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-8 text-center">
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
    </>
  )
}

// Reusable Components tetap diletakkan di bawah atau di file terpisah
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