'use client'
import { useEffect } from 'react'
import { X, Scale, TrendingUp } from 'lucide-react'
import { KesegaranBadge, kesegaranConfig } from './KesegaranBadge'
import { NutrisiBar } from './NutrisiBar'

export function DetailModal({ item, onClose }: { item: any | null; onClose: () => void }) {
  useEffect(() => {
    if (item) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [item])

  if (!item) return null
  const cfg = kesegaranConfig[item.kesegaran as keyof typeof kesegaranConfig]

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
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

          <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Kandungan Nutrisi</p>
            <NutrisiBar label="Karbohidrat" value={item.nutrisi.karbohidrat} max={50} color="bg-blue-400" />
            <NutrisiBar label="Protein"     value={item.nutrisi.protein}      max={10} color="bg-violet-400" />
            <NutrisiBar label="Serat"        value={item.nutrisi.serat}        max={10} color="bg-green-400" />
            <NutrisiBar label="Lemak"        value={item.nutrisi.lemak}        max={5}  color="bg-orange-400" />
          </div>

          <div>
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2.5">Rekomendasi Olahan</p>
            <div className="flex flex-wrap gap-2">
              {item.rekomendasi.map((r: string) => (
                <span key={r} className="bg-green-50 text-green-700 border border-green-200 text-xs font-semibold px-3 py-1.5 rounded-xl">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}