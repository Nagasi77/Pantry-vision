'use client'

import { Search, ChevronDown, Download, Eye } from 'lucide-react'

export default function RiwayatScanPage() {
  const dataScan = [
    { id: 'SCN-001', tanggal: '2026-04-22 08:34', bahan: 'Apel Fuji', jenis: 'Buah', berat: '182g', status: 'Segar', kalori: '95 kcal' },
    { id: 'SCN-002', tanggal: '2026-04-22 09:12', bahan: 'Wortel', jenis: 'Sayuran', berat: '220g', status: 'Segar', kalori: '82 kcal' },
  ]

  return (
    <div className="max-w-7xl mx-auto w-full space-y-8">
      {/* HEADER JUDUL (Opsional, jika di header layout belum ada judul dinamis) */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Scan</h2>
        <button className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* STATS CARDS (GRID 4 KOLOM) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Scan" value="2" icon="🍃" color="bg-green-50 text-green-600" />
        <StatCard label="Bahan Segar" value="2" icon="✅" color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Tidak Segar" value="0" icon="❌" color="bg-red-50 text-red-600" />
        <StatCard label="Rata-rata Berat" value="201g" icon="⚖️" color="bg-blue-50 text-blue-600" />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        {/* FILTER BAR */}
        <div className="p-6 border-b border-slate-50 flex flex-wrap gap-4 items-center justify-between bg-white/50">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari bahan atau ID scan..." 
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-sm font-medium focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
            />
          </div>
          <div className="flex gap-3">
            <FilterSelect label="Semua" />
            <FilterSelect label="Semua" />
          </div>
        </div>

        {/* TABLE CONTENT */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID Scan</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal & Waktu</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bahan</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Berat</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kesegaran</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kalori</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {dataScan.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="px-8 py-5">
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">{item.id}</span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500">{item.tanggal}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-lg">🍎</div>
                      <span className="text-sm font-black text-slate-800">{item.bahan}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[10px] font-bold uppercase">{item.jenis}</span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-500">⚖️ {item.berat}</td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase border border-green-100/50 inline-flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-bold text-slate-800">{item.kalori}</td>
                  <td className="px-6 py-5 text-center">
                    <button className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all">
                      <Eye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER TABLE */}
        <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400">Menampilkan <span className="text-slate-800">2</span> dari <span className="text-slate-800">2</span> data</p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
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

function FilterSelect({ label }: { label: string }) {
  return (
    <div className="relative group">
      <button className="flex items-center gap-4 bg-white border border-slate-100 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:border-slate-200 transition-all">
        {label} <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
      </button>
    </div>
  )
}