"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, AlertCircle, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { supabase } from "../../lib/supabase";

type PantryItem = {
  id: string;
  item_name: string;
  current_weight: number;
  min_weight_threshold: number;
  unit: string;
  expired_date: string | null;
  freshness_status: string | null;
  freshness_score: number | null;
  quantity: number;
  icon: string;
  category_id: number | null;
};

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PantryItem | null>(null);
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      setInventory(data || []);
    } catch (err: any) {
      console.error("Gagal mengambil data inventori:", err.message || err);
      setError("Gagal memuat inventori: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchInventory(session.user.id);
    }
  }, [session, status, fetchInventory]);

  // Normalisasi freshness_status ke label yang konsisten
  const normalizeFreshness = (status: string | null): string => {
    if (!status) return "Tidak Diketahui";
    const s = status.toLowerCase();
    if (s.includes("fresh") || s.includes("segar")) return "Segar";
    if (s.includes("decline") || s.includes("menurun") || s.includes("warning")) return "Menurun";
    return "Hampir busuk";
  };

  const filtered = inventory.filter((item) =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
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

  // Hitung lebar bar berdasarkan current_weight vs min_weight_threshold
  const getStockBarWidth = (item: PantryItem): number => {
    if (!item.min_weight_threshold || item.min_weight_threshold === 0) return 50;
    const ratio = (item.current_weight / (item.min_weight_threshold * 3)) * 100;
    return Math.min(Math.max(ratio, 5), 100);
  };

  // Hitung hari hingga kadaluarsa
  const getDaysUntilExpiry = (expiredDate: string | null): string | null => {
    if (!expiredDate) return null;
    const diff = Math.ceil(
      (new Date(expiredDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (diff < 0) return "Sudah kadaluarsa";
    if (diff === 0) return "Kadaluarsa hari ini";
    return `${diff} hari lagi`;
  };

  // Loading: saat session belum siap atau data pertama kali dimuat
  if (status === "loading" || (loading && inventory.length === 0)) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
          Memuat Inventori...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-600 p-5 rounded-2xl border border-red-100">
        <AlertCircle size={20} />
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  const freshCount = inventory.filter(
    (i) => normalizeFreshness(i.freshness_status) === "Segar"
  ).length;
  const needCheckCount = inventory.filter(
    (i) => normalizeFreshness(i.freshness_status) !== "Segar"
  ).length;

  return (
    <div className="space-y-8">
      {/* SEARCH BOX */}
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-green-500 transition-colors"
          size={18}
        />
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
        <SummaryCard label="Total Item" value={inventory.length} />
        <SummaryCard
          label="Segar"
          value={freshCount}
          color="text-green-400"
          valueColor="text-green-800"
        />
        <SummaryCard
          label="Perlu Dicek"
          value={needCheckCount}
          color="text-red-400"
          valueColor="text-red-800"
        />
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-bold text-sm">
            {search ? "Bahan tidak ditemukan" : "Inventori masih kosong"}
          </p>
        </div>
      )}

      {/* GRID INVENTORY */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
        {filtered.map((item) => {
          const freshnessLabel = normalizeFreshness(item.freshness_status);
          return (
            <div
              key={item.id}
              className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 hover:border-slate-200 hover:shadow-md transition-all duration-300 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon || "📦"}</span>
                  <h3 className="font-black text-slate-800 tracking-tight">
                    {item.item_name}
                  </h3>
                </div>
                <span
                  className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${getBadge(freshnessLabel)}`}
                >
                  {freshnessLabel}
                </span>
              </div>

              <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-tighter">
                {item.current_weight} {item.unit}
                {item.freshness_score != null &&
                  ` • Skor: ${item.freshness_score.toFixed(0)}%`}
              </p>

              <div className="mb-6">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div
                    className={`h-full ${getBarColor(freshnessLabel)} transition-all duration-1000`}
                    style={{ width: `${getStockBarWidth(item)}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Qty: {item.quantity}
                </span>
                <button
                  onClick={() => setSelected(item)}
                  className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-xl hover:bg-green-600 transition-colors uppercase tracking-widest"
                >
                  Detail
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETAIL */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-md shadow-2xl space-y-6 border border-white">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-100">
                {selected.icon || "📦"}
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">
                  {selected.item_name}
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${getBadge(normalizeFreshness(selected.freshness_status))}`}
                >
                  {normalizeFreshness(selected.freshness_status)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Berat
                </p>
                <p className="font-black text-slate-800">
                  {selected.current_weight} {selected.unit}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Jumlah
                </p>
                <p className="font-black text-slate-800">{selected.quantity}</p>
              </div>
              {selected.expired_date && (
                <div className="p-3 bg-slate-50 rounded-2xl text-left col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Kadaluarsa
                  </p>
                  <p className="font-black text-slate-800">
                    {new Date(selected.expired_date).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    <span className="text-xs font-bold text-slate-500">
                      ({getDaysUntilExpiry(selected.expired_date)})
                    </span>
                  </p>
                </div>
              )}
              {selected.freshness_score != null && (
                <div className="p-3 bg-slate-50 rounded-2xl text-left col-span-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                    Skor Kesegaran
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getBarColor(normalizeFreshness(selected.freshness_status))} rounded-full`}
                        style={{ width: `${selected.freshness_score}%` }}
                      />
                    </div>
                    <span className="font-black text-slate-800 text-sm">
                      {selected.freshness_score.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )}
            </div>

            {normalizeFreshness(selected.freshness_status) !== "Segar" && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-left">
                <AlertCircle size={18} />
                Bahan ini mulai tidak segar, segera gunakan!
              </div>
            )}

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
function SummaryCard({
  label,
  value,
  color = "text-slate-400",
  valueColor = "text-slate-800",
}: {
  label: string;
  value: number;
  color?: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center transition-all hover:scale-[1.03] duration-300">
      <p className={`text-[10px] font-black ${color} uppercase tracking-widest mb-2`}>
        {label}
      </p>
      <p className={`text-3xl font-black ${valueColor}`}>{value}</p>
    </div>
  );
}