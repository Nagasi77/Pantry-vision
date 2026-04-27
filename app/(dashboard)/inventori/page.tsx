"use client";

import { useState } from "react";
import { Search, AlertCircle } from "lucide-react";

const dummyInventory = [
  { id: 1, name: "Apel", weight: 150, calories: 52, stock: 5, freshness: "Segar" },
  { id: 2, name: "Pisang", weight: 120, calories: 89, stock: 2, freshness: "Menurun" },
  { id: 3, name: "Wortel", weight: 100, calories: 41, stock: 3, freshness: "Segar" },
  { id: 4, name: "Tomat", weight: 80, calories: 18, stock: 6, freshness: "Segar" },
  { id: 5, name: "Kentang", weight: 200, calories: 77, stock: 4, freshness: "Menurun" },
  { id: 6, name: "Brokoli", weight: 90, calories: 34, stock: 2, freshness: "Hampir busuk" },
  { id: 7, name: "Jeruk", weight: 130, calories: 47, stock: 5, freshness: "Segar" },
  { id: 8, name: "Anggur", weight: 110, calories: 69, stock: 3, freshness: "Segar" },
  { id: 9, name: "Bayam", weight: 70, calories: 23, stock: 1, freshness: "Hampir busuk" },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);

  const filtered = dummyInventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const getBadge = (status: string) => {
    if (status === "Segar") return "bg-green-100 text-green-700";
    if (status === "Menurun") return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
  };

  const getBarColor = (status: string) => {
    if (status === "Segar") return "bg-green-500";
    if (status === "Menurun") return "bg-yellow-400";
    return "bg-red-500";
  };

  return (
    <div className="space-y-8">
      {/* SEARCH BOX */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors" size={18} />
        <input
          type="text"
          placeholder="Cari bahan makanan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-sm"
        />
      </div>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard label="Total Item" value={dummyInventory.length} />
        <SummaryCard label="Segar" value={dummyInventory.filter(i => i.freshness === 'Segar').length} color="text-green-400" valueColor="text-green-800" />
        <SummaryCard label="Perlu Dicek" value={dummyInventory.filter(i => i.freshness !== 'Segar').length} color="text-red-400" valueColor="text-red-800" />
      </div>

      {/* GRID INVENTORY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
        {filtered.map((item) => (
          <div key={item.id} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 hover:border-slate-200 hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-slate-800 tracking-tight">{item.name}</h3>
              <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${getBadge(item.freshness)}`}>
                {item.freshness}
              </span>
            </div>

            <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-tighter">
              {item.weight} g • {item.calories} kkal
            </p>

            <div className="mb-6">
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`h-full ${getBarColor(item.freshness)} transition-all duration-1000`}
                  style={{ width: `${item.stock * 15}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stok: {item.stock}</span>
              <button
                onClick={() => setSelected(item)}
                className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-xl hover:bg-green-600 transition-colors uppercase tracking-widest"
              >
                Detail
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETAIL */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-md shadow-2xl space-y-6 border border-white">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-100">
                🍎
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">{selected.name}</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${getBadge(selected.freshness)}`}>
                  {selected.freshness}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Berat</p>
                <p className="font-black text-slate-800">{selected.weight} g</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Kalori</p>
                <p className="font-black text-slate-800">{selected.calories} kkal</p>
              </div>
            </div>

            {selected.freshness !== "Segar" && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-left">
                <AlertCircle size={18} />
                Bahan ini mulai tidak segar, segera gunakan!
              </div>
            )}

            <div className="text-left">
              <p className="text-xs font-black text-slate-800 uppercase tracking-widest mb-3">Saran Menu</p>
              <div className="flex flex-wrap gap-2">
                {["Salad buah", "Jus sehat", "Smoothie"].map(menu => (
                  <span key={menu} className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-lg border border-green-100 uppercase tracking-tighter">{menu}</span>
                ))}
              </div>
            </div>

            <button
              onClick={() => setSelected(null)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Komponen Pembantu
function SummaryCard({ label, value, color = "text-slate-400", valueColor = "text-slate-800" }: any) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center transition-all hover:scale-[1.03] duration-300">
      <p className={`text-[10px] font-black ${color} uppercase tracking-widest mb-2`}>{label}</p>
      <p className={`text-3xl font-black ${valueColor}`}>{value}</p>
    </div>
  );
}