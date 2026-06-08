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
  PackageSearch,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// ── Types & Helpers ──────────────────────────────────────────────────────────
type ScanDetection = {
  id: string
  scan_session_id: string
  item_name: string
  raw_label: string
  freshness_status: string
  confidence: number
  icon: string
}

type InventoryItem = {
  item_name: string
  icon: string
  freshness_status: string
  quantity: number
  avg_confidence: number
}

function normalizeConfidence(confidence: number) {
  if (!Number.isFinite(confidence)) return 0
  const percent = confidence <= 1 ? confidence * 100 : confidence
  return Math.round(Math.max(0, Math.min(100, percent)))
}

function isSegar(status: string) {
  return status?.toLowerCase() === 'segar'
}

function isBusuk(status: string) {
  return status?.toLowerCase() === 'busuk'
}

function aggregateDetections(detections: ScanDetection[]): InventoryItem[] {
  const map: Record<string, InventoryItem> = {}
  for (const d of detections) {
    const key = d.item_name
    if (!map[key]) {
      map[key] = {
        item_name: d.item_name,
        icon: d.icon,
        freshness_status: d.freshness_status,
        quantity: 0,
        avg_confidence: 0,
      }
    }
    map[key].quantity += 1
    map[key].avg_confidence += normalizeConfidence(d.confidence)
    if (isBusuk(d.freshness_status)) {
      map[key].freshness_status = 'Busuk'
    }
  }
  return Object.values(map).map(item => ({
    ...item,
    avg_confidence: item.quantity > 0 ? Math.round(item.avg_confidence / item.quantity) : 0,
  }))
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    total: 0,
    aman: 0,
    busuk: 0,
    scan: 0,
    busukName: '-',
  })
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [sensorRealtime, setSensorRealtime] = useState({
    gas: 'Normal',
    jarak: 0,
  })
  const [chartData, setChartData] = useState<{ time: string; count: number }[]>([])

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Ambil data scan terbaru (API yang sama dengan Inventori & Sensor)
      const res = await fetch('/api/ai/iot-latest')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const rawDetections: ScanDetection[] = data.detections ?? []
      const sessionData = data.session

      // 2. Aggregate menjadi item‑item unik
      const items = aggregateDetections(rawDetections)

      // 3. Hitung statistik berdasarkan detections
      const totalDetections = rawDetections.length
      const segarCount = rawDetections.filter(d => isSegar(d.freshness_status)).length
      const busukCount = rawDetections.filter(d => isBusuk(d.freshness_status)).length

      // 4. Ambil total scan history dari sensor_data
      const { count: scanCount, error: scanError } = await supabase
        .from('sensor_data')
        .select('*', { count: 'exact', head: true })

      // 5. Ambil SEMUA sesi scan untuk chart tren
      const { data: sessions, error: sessionsError } = await supabase
        .from('scan_sessions')
        .select('scanned_at, item_count')
        .order('scanned_at', { ascending: true })

      if (sessionsError) {
        console.error('Error fetching scan sessions:', sessionsError)
      } else if (sessions) {
        const formatted = sessions.map(s => {
          const date = new Date(s.scanned_at)
          return {
            time:
              date.toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
              }) +
              ' ' +
              date.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            count: s.item_count,
          }
        })
        setChartData(formatted)
      }

      // 6. Update state
      setInventory(items.slice(0, 5))
      setStats({
        total: totalDetections,
        aman: segarCount,
        busuk: busukCount,
        scan: scanCount ?? 0,
        busukName:
          busukCount > 0
            ? items.find(i => i.freshness_status === 'Busuk')?.item_name || '-'
            : '-',
      })

      // 7. Sensor real‑time dari session terbaru
      if (sessionData) {
        setSensorRealtime({
          gas: sessionData.gas_status || 'Normal',
          jarak: sessionData.jarak_cm || 0,
        })
      }
    } catch (error: any) {
      console.error('Gagal mengambil data dashboard:', error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchDashboardData()
    }
  }, [status, fetchDashboardData])

  // Tampilan Loading
  if (status === 'loading' || (loading && inventory.length === 0)) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
          Memuat PantryVision...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-12">
      {/* STATS SECTION */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Bahan"
          value={stats.total}
          icon={ShoppingBag}
          valueColor="text-green-600"
        />
        <StatCard
          label="Stok Segar"
          value={stats.aman}
          subLabel={`DARI ${stats.total} ITEM`}
          icon={CheckCircle2}
          valueColor="text-green-600"
        />
        <StatCard
          label="Busuk"
          value={stats.busuk}
          subLabel={stats.busukName}
          icon={AlertCircle}
          valueColor="text-red-500"
        />
        <StatCard
          label="Total Scan"
          value={stats.scan}
          subLabel="HISTORY ALAT"
          icon={Activity}
          valueColor="text-blue-600"
        />
      </div>

      {/* CHART TREN DETEKSI (SEMUA SESI) */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                Tren Deteksi Objek
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Jumlah item terdeteksi per sesi scan (semua sesi)
              </p>
            </div>
          </div>
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  label={{ value: 'Item', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#16a34a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* INVENTORI DAPUR */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              Inventori Dapur
            </h3>
            <Link
              href="/inventori"
              className="text-[10px] font-bold text-green-600 flex items-center gap-1 uppercase tracking-widest group"
            >
              Lihat Semua{' '}
              <ChevronRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </Link>
          </div>

          <div className="space-y-4">
            {inventory.length > 0 ? (
              inventory.map(item => (
                <InventoryItem
                  key={item.item_name}
                  icon={item.icon}
                  name={item.item_name}
                  qty={`${item.quantity} pcs`}
                  freshness={item.freshness_status}
                  color={
                    item.freshness_status === 'Busuk'
                      ? 'bg-red-500'
                      : 'bg-green-500'
                  }
                  percentage={
                    item.avg_confidence ? `${item.avg_confidence}%` : '0%'
                  }
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                <PackageSearch size={48} strokeWidth={1} />
                <p className="mt-4 text-xs font-bold uppercase tracking-widest">
                  Belum ada bahan
                </p>
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
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
              </span>
              Live Monitoring
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-8 text-center">
              <SensorCard
                label="Gas"
                val={sensorRealtime.gas}
                valColor={
                  sensorRealtime.gas === 'Normal'
                    ? 'text-green-400'
                    : 'text-red-400'
                }
              />
              <SensorCard label="Jarak" val={`${sensorRealtime.jarak}cm`} />
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl p-7 rounded-3xl border border-white/10 shadow-inner relative z-10 transition-all">
            <div className="flex gap-4 items-center">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                {sensorRealtime.jarak > 0 && sensorRealtime.jarak < 20
                  ? '🔍'
                  : '📭'}
              </div>
              <div className="text-left">
                <p className="font-black text-lg text-white leading-none mb-1.5 tracking-tight">
                  {sensorRealtime.jarak > 0 && sensorRealtime.jarak < 20
                    ? 'Objek Terdeteksi'
                    : 'Siap Memindai'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  {sensorRealtime.jarak > 0 && sensorRealtime.jarak < 20
                    ? `Jarak: ${sensorRealtime.jarak}cm · Gas: ${sensorRealtime.gas}`
                    : 'Letakkan bahan di depan sensor'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  subLabel,
  valueColor,
}: {
  label: string
  value: number | string
  subLabel?: string
  valueColor: string
  icon?: any
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center transition-all hover:scale-[1.03] duration-300">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 leading-none">
        {label}
      </p>
      <p className={`text-4xl font-black tracking-tighter leading-none ${valueColor}`}>
        {value}
      </p>
      {subLabel && (
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">
          {subLabel}
        </p>
      )}
    </div>
  )
}

function InventoryItem({
  icon,
  name,
  qty,
  freshness,
  color,
  percentage,
}: {
  icon: string
  name: string
  qty: string
  freshness: string
  color: string
  percentage: string
}) {
  const status = freshness?.toLowerCase()
  const isBusuk = status === 'busuk'
  const statusLabel = isBusuk ? 'Busuk' : status === 'segar' ? 'Segar' : freshness
  const statusCls = isBusuk
    ? 'text-red-600'
    : status === 'segar'
    ? 'text-green-600'
    : 'text-slate-500'

  return (
    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-transparent hover:border-slate-100 hover:bg-white transition-all group">
      <div className="flex items-center gap-4 text-left">
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-2xl shadow-sm border border-slate-50">
          {icon}
        </div>
        <div>
          <p className="font-black text-slate-800 leading-none mb-1">{name}</p>
          <p className={`text-[10px] font-bold uppercase tracking-tighter ${statusCls}`}>
            {statusLabel}
          </p>
        </div>
      </div>
      <div className="flex-1 max-w-[120px] mx-8 hidden sm:block">
        <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${color} rounded-full transition-all duration-1000`}
            style={{ width: percentage }}
          />
        </div>
      </div>
      <div className="px-4 py-1.5 bg-white rounded-lg text-xs font-black shadow-sm border border-slate-50 text-slate-700">
        {qty}
      </div>
    </div>
  )
}

function SensorCard({
  label,
  val,
  valColor = 'text-white',
}: {
  label: string
  val: string | number
  valColor?: string
}) {
  return (
    <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/5">
      <p className="text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-tighter">
        {label}
      </p>
      <p className={`font-black text-sm ${valColor}`}>{val}</p>
    </div>
  )
}