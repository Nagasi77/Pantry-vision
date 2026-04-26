'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Package, Activity, Scan,
  History, User, LogOut, ChevronDown,
  Search, Eye, Leaf, Scale, Clock,
  CheckCircle, AlertTriangle, XCircle,
  TrendingUp, Apple, Carrot, Download, X
} from 'lucide-react'

// ─── Types ─────────────────────────────────
interface ScanRecord {
  id: string
  tanggal: string
  waktu: string
  bahan: string
  jenis: 'Buah' | 'Sayuran'
  berat: number
  kesegaran: 'Segar' | 'Cukup Segar' | 'Tidak Segar'
  nutrisi: { kalori: number; protein: number; karbohidrat: number; lemak: number; serat: number }
  rekomendasi: string[]
  icon: string
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const SCAN_DATA: ScanRecord[] = [
  { 
    id: 'SCN-001', tanggal: '2026-04-22', waktu: '08:34', bahan: 'Apel Fuji', 
    jenis: 'Buah', berat: 182, kesegaran: 'Segar', 
    nutrisi: { kalori: 95, protein: 0.5, karbohidrat: 25, lemak: 0.3, serat: 4.4 }, 
    rekomendasi: ['Jus Apel', 'Salad Buah', 'Smoothie'], icon: '🍎' 
  },
  { 
    id: 'SCN-002', tanggal: '2026-04-22', waktu: '09:12', bahan: 'Wortel', 
    jenis: 'Sayuran', berat: 220, kesegaran: 'Segar', 
    nutrisi: { kalori: 82, protein: 1.9, karbohidrat: 19, lemak: 0.2, serat: 5.6 }, 
    rekomendasi: ['Sup Wortel', 'Jus Wortel', 'Tumis Sayur'], icon: '🥕' 
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────
const kesegaranConfig = {
  'Segar':       { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', Icon: CheckCircle },
  'Cukup Segar': { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-200',   Icon: AlertTriangle },
  'Tidak Segar': { color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-200',     Icon: XCircle },
}

function KesegaranBadge({ status }: { status: ScanRecord['kesegaran'] }) {
  const cfg = kesegaranConfig[status]
  const { Icon } = cfg
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon size={11} />{status}
    </span>
  )
}

function NutrisiBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className="text-slate-700 font-bold">{value}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }: { item: ScanRecord | null; onClose: () => void }) {
  useEffect(() => {
    if (item) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [item])

  if (!item) return null
  const cfg = kesegaranConfig[item.kesegaran]

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`${cfg.bg} px-6 py-5 flex items-center gap-4 border-b ${cfg.border}`}>
          <span className="text-5xl">{item.icon}</span>
          <div className="flex-1">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">{item.jenis} · {item.id}</p>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">{item.bahan}</h3>
            <div className="flex items-center gap-3 mt-1">
              <KesegaranBadge status={item.kesegaran} />
              <span className="text-xs text-slate-500">{item.tanggal} · {item.waktu}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 transition-all">
            <X size={14} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
              <Scale size={18} className="text-green-600" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Berat</p>
                <p className="text-lg font-black text-slate-800">{item.berat}g</p>
              </div>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-3">
              <TrendingUp size={18} className="text-green-600" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kalori</p>
                <p className="text-lg font-black text-slate-800">{item.nutrisi.kalori} kkal</p>
              </div>
            </div>
          </div>

          {/* Nutrisi */}
          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Kandungan Nutrisi</p>
            <NutrisiBar label="Karbohidrat" value={item.nutrisi.karbohidrat} max={50} color="bg-blue-400" />
            <NutrisiBar label="Protein"     value={item.nutrisi.protein}     max={10} color="bg-violet-400" />
            <NutrisiBar label="Serat"       value={item.nutrisi.serat}       max={10} color="bg-green-400" />
            <NutrisiBar label="Lemak"       value={item.nutrisi.lemak}       max={5}  color="bg-orange-400" />
          </div>

          {/* Rekomendasi */}
          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Rekomendasi Olahan</p>
            <div className="flex flex-wrap gap-2">
              {item.rekomendasi.map(r => (
                <span key={r} className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-3 py-1.5 rounded-xl">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────
export default function RiwayatPage() {
  const pathname = usePathname()
  const router   = useRouter()

  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [user] = useState({ fullname: 'Muhammad Dimas Ajie', email: 'mahasiswa123@gmail.com' })

  // ─── STATE RIWAYAT ───
  const [search, setSearch] = useState('')
  const [filterKesegaran, setFilterKesegaran] = useState('Semua')
  const [filterJenis, setFilterJenis] = useState('Semua')
  const [selectedItem, setSelectedItem] = useState<ScanRecord | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  const navItemStyle = (path: string) =>
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
      pathname === path
        ? 'bg-green-600 text-white shadow-lg'
        : 'text-slate-500 hover:bg-slate-50 hover:text-green-600'
    }`

  // ─── FILTER DATA ───
  const filtered = SCAN_DATA.filter(d => {
    const matchSearch = d.bahan.toLowerCase().includes(search.toLowerCase()) || 
                        d.id.toLowerCase().includes(search.toLowerCase())
    const matchKesegaran = filterKesegaran === 'Semua' || d.kesegaran === filterKesegaran
    const matchJenis = filterJenis === 'Semua' || d.jenis === filterJenis
    return matchSearch && matchKesegaran && matchJenis
  })

  // ─── SUMMARY ───
  const totalScan = SCAN_DATA.length
  const segar = SCAN_DATA.filter(d => d.kesegaran === 'Segar').length
  const tidakSegar = SCAN_DATA.filter(d => d.kesegaran === 'Tidak Segar').length
  const avgBerat = SCAN_DATA.length > 0 
    ? Math.round(SCAN_DATA.reduce((a, b) => a + b.berat, 0) / SCAN_DATA.length) 
    : 0

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">

      {/* ── SIDEBAR ── */}
      <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 sticky top-0 h-screen shadow-sm z-20">
        <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
          <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
            <Package className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-800">Pantry Vision</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Menu Utama</p>
          <Link href="/dashboard" className={navItemStyle('/dashboard')}><LayoutDashboard size={20} /> <span>Dashboard</span></Link>
          <Link href="/inventori" className={navItemStyle('/inventori')}><Package size={20} /> <span>Inventori</span></Link>
          <Link href="/sensor"    className={navItemStyle('/sensor')}><Activity size={20} /> <span>Sensor</span></Link>
          <Link href="/scan"      className={navItemStyle('/scan')}><Scan size={20} /> <span>Scan</span></Link>
          <Link href="/riwayat"   className={navItemStyle('/riwayat')}><History size={20} /> <span>Riwayat Scan</span></Link>

          <div className="pt-8 border-t border-slate-50 mt-4">
            <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Akun</p>
            <Link href="/profile" className={navItemStyle('/profile')}><User size={20} /> <span>Profile</span></Link>
          </div>
        </nav>
      </aside>

      {/* ── MAIN CONTENT ── */}
                <main className="flex-1 flex flex-col overflow-y-auto">
                  
                  <header className="h-20 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-100 flex items-center justify-between px-10">
                    <h2 className="text-xl font-black text-slate-800 tracking-tighter">Riwayat Scan</h2>
                    
                  {/* HEADER PROFILE DROPDOWN (Ramping) */}
                  <div className="relative" ref={dropdownRef}>
                    <button 
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`flex items-center gap-2.5 p-1 pr-1 rounded-xl transition-all duration-300 ${
                        isDropdownOpen ? "bg-white shadow-sm ring-1 ring-slate-100" : "bg-slate-50/50 border border-slate-100 hover:bg-white"
                      }`}
                    >
                      <div className="w-8 h-8 bg-green-100 text-green-700 font-bold rounded-lg border border-white flex items-center justify-center text-xs uppercase shadow-sm">
                        {getInitial(user.fullname)}
                      </div>
                    </button>

                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                      
                      {/* BAGIAN TENGAH (AVATAR & INFO) */}
                      <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
                        {/* Avatar Inisial di Tengah */}
                        <div className="w-12 h-12 bg-green-100 text-green-700 font-black rounded-2xl border-2 border-white flex items-center justify-center text-lg shadow-sm mb-3 uppercase">
                        {getInitial(user.fullname)}
                      </div>
                  
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Akun Aktif</p>
                  <p className="text-sm font-black text-slate-800 leading-tight">{user.fullname}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate w-full">{user.email}</p>
                </div>
                <button
                  onClick={() => router.push('/')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 text-xs"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="p-10">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Scan',      value: totalScan,      icon: <Leaf size={18} />,          light: 'bg-green-50 text-green-600' },
              { label: 'Bahan Segar',     value: segar,          icon: <CheckCircle size={18} />, light: 'bg-emerald-50 text-emerald-600' },
              { label: 'Tidak Segar',     value: tidakSegar,     icon: <XCircle size={18} />,      light: 'bg-red-50 text-red-600' },
              { label: 'Rata-rata Berat', value: `${avgBerat}g`, icon: <Scale size={18} />,       light: 'bg-blue-50 text-blue-600' },
            ].map(card => (
              <div key={card.label} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-all">
                <div className={`w-11 h-11 rounded-xl ${card.light} flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-2xl font-black text-slate-800 leading-none">{card.value}</p>
                  <p className="text-[11px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">{card.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari bahan atau ID scan..."
                  className="w-full pl-9 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <div className="relative">
                  <select
                    value={filterKesegaran}
                    onChange={e => setFilterKesegaran(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 text-slate-600 cursor-pointer"
                  >
                    <option>Semua</option>
                    <option>Segar</option>
                    <option>Cukup Segar</option>
                    <option>Tidak Segar</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="relative">
                  <select
                    value={filterJenis}
                    onChange={e => setFilterJenis(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/30 text-slate-600 cursor-pointer"
                  >
                    <option>Semua</option>
                    <option>Buah</option>
                    <option>Sayuran</option>
                  </select>
                  <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['ID Scan', 'Tanggal & Waktu', 'Bahan', 'Jenis', 'Berat', 'Kesegaran', 'Kalori', 'Aksi'].map(h => (
                      <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center text-slate-400 text-sm">
                        Tidak ada data yang cocok dengan filter.
                      </td>
                    </tr>
                  ) : filtered.map((item, i) => (
                    <tr key={item.id} className={`border-b border-slate-50 hover:bg-slate-50/70 transition-colors ${i % 2 !== 0 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-5 py-4">
                        <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{item.id}</span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-slate-400 shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-slate-700">{item.tanggal}</p>
                            <p className="text-[11px] text-slate-400">{item.waktu}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="text-2xl leading-none">{item.icon}</span>
                          <span className="font-semibold text-slate-800">{item.bahan}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${item.jenis === 'Buah' ? 'bg-orange-50 text-orange-600 border border-orange-200' : 'bg-teal-50 text-teal-600 border border-teal-200'}`}>
                          {item.jenis === 'Buah' ? <Apple size={10} /> : <Carrot size={10} />}
                          {item.jenis}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5">
                          <Scale size={13} className="text-slate-400" />
                          <span className="font-bold text-slate-700">{item.berat}g</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <KesegaranBadge status={item.kesegaran} />
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-700">{item.nutrisi.kalori}</span>
                        <span className="text-xs text-slate-400 ml-1">kkal</span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-green-600 hover:text-white bg-green-50 hover:bg-green-600 border border-green-200 px-3 py-1.5 rounded-xl transition-all duration-200"
                        >
                          <Eye size={12} /> Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Menampilkan <span className="font-bold text-slate-600">{filtered.length}</span> dari <span className="font-bold text-slate-600">{SCAN_DATA.length}</span> data
              </p>
              <button className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-green-600 transition-colors">
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
        </div>
      </main>
    </div>
  )
}