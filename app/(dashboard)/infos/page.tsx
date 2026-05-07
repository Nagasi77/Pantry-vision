"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Apple, Leaf, Sparkles, ChevronRight, Loader2, X, Info } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { NutrisiBar } from "../../../components/riwayat/NutrisiBar";

// Menentukan tipe Tab agar tidak menggunakan 'any'
type TabType = "All" | "Fruit" | "Veggie";

type NutridexItem = {
  id: number;
  name: string;
  local_name: string;
  description: string;
  category_id: number;
  icon: string;
  food_nutrients: {
    calories: number;
    protein_gram: number;
    fat_gram: number;
    carbohydrate_gram: number;
    fiber_gram: number;
    sugar_gram: number;
    sodium_mg: number;
    potassium_mg: number;
    calcium_mg: number;
    iron_mg: number;
    vitamin_c_mg: number;
    serving_size_gram: number;
  };
  food_benefits: { benefit: string }[];
};

export default function NutridexPage() {
  const [items, setItems] = useState<NutridexItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("All");
  const [selected, setSelected] = useState<NutridexItem | null>(null);

  useEffect(() => {
    const fetchNutridex = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("foods")
          .select(`
            *,
            food_nutrients (*),
            food_benefits (benefit)
          `)
          .order('id', { ascending: true });

        if (error) throw error;
        setItems(data || []);
      } catch (err) {
        console.error("Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchNutridex();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = 
        item.local_name.toLowerCase().includes(search.toLowerCase()) || 
        item.name.toLowerCase().includes(search.toLowerCase());
      const matchesTab = 
        activeTab === "All" ? true :
        activeTab === "Fruit" ? item.category_id === 1 : 
        item.category_id === 2;
      return matchesSearch && matchesTab;
    });
  }, [items, search, activeTab]);

  if (loading) return (
    <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
      <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
      <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Menyusun Nutridex...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      {/* SEARCH & FILTER SECTION */}
      <div className="space-y-4">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Cari buah atau sayur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {(["All", "Fruit", "Veggie"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border flex items-center ${
                activeTab === tab 
                  ? "bg-slate-900 border-slate-900 text-white shadow-lg" 
                  : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
              }`}
            >
              {tab === "Fruit" && <Apple size={12} className="mr-2" />}
              {tab === "Veggie" && <Leaf size={12} className="mr-2" />}
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* GRID NUTRIDEX */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 hover:border-green-100 hover:shadow-md transition-all duration-300 group flex flex-col"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 text-2xl group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 tracking-tight leading-none">{item.local_name}</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{item.name}</p>
                </div>
              </div>
              <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase ${item.category_id === 1 ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                {item.category_id === 1 ? 'Fruit' : 'Veggie'}
              </span>
            </div>

            <div className="space-y-2 mb-6 flex-grow">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Manfaat Kesehatan:</p>
              {item.food_benefits?.slice(0, 2).map((b, i) => (
                <div key={i} className="flex items-start gap-2 bg-slate-50/50 p-2.5 rounded-xl border border-slate-50">
                  <Sparkles size={10} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] font-bold text-slate-600 leading-tight">{b.benefit}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
               <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                  <Info size={12} />
                  <span>{item.food_nutrients?.calories || 0} kcal</span>
               </div>
              <button 
                onClick={() => setSelected(item)}
                className="text-[10px] font-black flex items-center gap-1 text-green-600 hover:gap-2 transition-all uppercase tracking-widest"
              >
                Lihat Nutrisi <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETAIL */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            
            <div className="p-8 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="text-5xl bg-slate-50 w-16 h-16 flex items-center justify-center rounded-[1.5rem]">{selected.icon}</div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">{selected.local_name}</h3>
                  <p className="text-sm font-bold text-slate-400 italic mt-1">{selected.name}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-8 pt-0 space-y-6 no-scrollbar">
              <div className="bg-green-50/50 p-5 rounded-[2rem] border border-green-100/50">
                {/* Menggunakan &quot; untuk escape karakter kutipan sesuai saran ESLint */}
                <p className="text-xs font-medium text-slate-600 leading-relaxed italic">
                  &quot;{selected.description}&quot;
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kandungan Nutrisi (per {selected.food_nutrients?.serving_size_gram || 100}g):</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  <NutrisiBar label="Kalori" value={selected.food_nutrients?.calories || 0} max={200} color="bg-orange-500" />
                  <div className="grid grid-cols-2 gap-3">
                    {/* Menghapus prop 'suffix' karena tidak ada di interface NutrisiBarProps */}
                    <NutrisiBar label="Protein (g)" value={selected.food_nutrients?.protein_gram || 0} max={15} color="bg-blue-500" />
                    <NutrisiBar label="Karbo (g)" value={selected.food_nutrients?.carbohydrate_gram || 0} max={50} color="bg-yellow-500" />
                    <NutrisiBar label="Serat (g)" value={selected.food_nutrients?.fiber_gram || 0} max={15} color="bg-green-600" />
                    <NutrisiBar label="Lemak (g)" value={selected.food_nutrients?.fat_gram || 0} max={10} color="bg-red-400" />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    { label: 'Gula', val: selected.food_nutrients?.sugar_gram, unit: 'g' },
                    { label: 'Kalsium', val: selected.food_nutrients?.calcium_mg, unit: 'mg' },
                    { label: 'Zat Besi', val: selected.food_nutrients?.iron_mg, unit: 'mg' },
                    { label: 'Vit C', val: selected.food_nutrients?.vitamin_c_mg, unit: 'mg' },
                    { label: 'Kalium', val: selected.food_nutrients?.potassium_mg, unit: 'mg' },
                  ].map((item, idx) => item.val ? (
                    <div key={idx} className="px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500">
                      {item.label}: <span className="text-slate-900">{item.val}{item.unit}</span>
                    </div>
                  ) : null)}
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kelebihan Utama:</p>
                {selected.food_benefits?.map((b, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="mt-1 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Sparkles size={10} className="text-green-600" />
                    </div>
                    <p className="text-xs font-bold text-slate-700">{b.benefit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8 pt-4">
              <button
                onClick={() => setSelected(null)}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-green-600 transition-colors shadow-lg"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}