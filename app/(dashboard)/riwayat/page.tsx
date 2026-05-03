'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '../../lib/supabase'
import { Search, Download, Eye, Loader2, PackageSearch } from 'lucide-react'
import { DetailModal } from '../../../components/riwayat/DetailModal'

export default function RiwayatScanPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [dataScan, setDataScan] = useState<any[]>([])
  const [selectedItem, setSelectedItem] = useState<any | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchHistory = useCallback(async (userId: string) => {
    try {
      setLoading(true)

      // 1. Ambil data dari pantry_items milik user
      const { data: items, error: pantryError } = await supabase
        .from('pantry_items')
        .select(`
          *,
          categories (name)
        `)
        .eq('user_id', userId)
        .order('last_scanned_at', { ascending: false })

      if (pantryError) throw pantryError

      // 2. Map data untuk menyesuaikan dengan props DetailModal & UI
      // Kita asumsikan detail nutrisi diambil berdasarkan item_name
      const formattedData = await Promise.all((items || []).map(async (item) => {
        const { data: nutrient } = await supabase
          .from('food_nutrients')
          .select('*, foods!inner(icon)')
          .eq('foods.name', item.item_name)
          .single()

        const dateObj = new Date(item.last_scanned_at || item.created_at)

        return {
          id: item.id.slice(0, 8).toUpperCase(),
          db_id: item.id,
          tanggal: dateObj.toLocaleDateString('id-ID'),
          waktu: dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
          bahan: item.item_name,
          jenis: item.categories?.name || 'Umum',
          berat: item.current_weight || 0,
          kesegaran: item.freshness_status || 'Segar',
          icon: item.icon || nutrient?.foods?.icon || '📦',
          nutrisi: {
            kalori: nutrient?.calories || 0,
            karbohidrat: nutrient?.carbohydrate_gram || 0,
            protein: nutrient?.protein_gram || 0,
            serat: nutrient?.fiber_gram || 0,
            lemak: nutrient?.fat_gram || 0,
          },
          rekomendasi: item.prediction_metadata?.recommendations || ['Simpan di tempat sejuk']
        }
      }))

      setDataScan(formattedData)
    } catch (error: any) {
      console.error("Gagal mengambil riwayat:", error.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchHistory(session.user.id)
    }
  }, [session, status, fetchHistory])

  // Logic Pencarian
  const filteredData = useMemo(() => {
    return dataScan.filter(item =>
      item.bahan.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [searchTerm, dataScan])

  // Stats sederhana untuk header
  const stats = {
    total: filteredData.length,
    segar: filteredData.filter(i => i.kesegaran === 'Segar').length,
    rataBerat: filteredData.length 
      ? Math.round(filteredData.reduce((acc, curr) => acc + curr.berat, 0) / filteredData.length) 
      : 0
  }

  if (status === "loading" || (loading && dataScan.length === 0)) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sinkronisasi Database...</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8 animate-in fade-in duration-700">
      {/* HEADER & STATS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Scan</h2>
        </div>
        <button className="flex items-center justify-center gap-2 bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Riwayat" value={stats.total} icon="🍃" color="bg-green-50 text-green-600" />
        <StatCard label="Kondisi Segar" value={stats.segar} icon="✅" color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Rerata Berat" value={`${stats.rataBerat}g`} icon="⚖️" color="bg-blue-50 text-blue-600" />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-wrap gap-4 items-center justify-between bg-white/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari bahan atau ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Scan</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bahan</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Berat</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <tr key={item.db_id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{item.id}</span>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-500">
                      {item.tanggal}
                      <span className="block text-[10px] text-slate-300 font-medium">{item.waktu}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg">{item.icon}</div>
                        <span className="text-sm font-black text-slate-800">{item.bahan}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-500">{item.berat}g</td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border inline-flex items-center gap-1.5 
                        ${item.kesegaran === 'Tidak Segar' ? 'bg-red-50 text-red-600 border-red-100' : 
                          item.kesegaran === 'Cukup Segar' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                          'bg-green-50 text-green-600 border-green-100'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${item.kesegaran === 'Tidak Segar' ? 'bg-red-500' : item.kesegaran === 'Cukup Segar' ? 'bg-amber-500' : 'bg-green-500'}`} />
                        {item.kesegaran}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <button 
                        onClick={() => setSelectedItem(item)}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-20">
                    <div className="flex flex-col items-center justify-center text-slate-300">
                      <PackageSearch size={48} strokeWidth={1} />
                      <p className="mt-4 text-xs font-bold uppercase tracking-widest">Tidak ada data scan ditemukan</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DETAIL */}
      <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />
    </div>
  )
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 transition-transform hover:scale-[1.02]">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{label}</p>
      </div>
    </div>
  )
}