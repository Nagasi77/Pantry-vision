"use client";

import { useState, useEffect, useCallback } from "react";
import { Search, AlertCircle, Loader2, Plus, X, Calendar, Clock, Timer, Trash2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { supabase } from "../../lib/supabase";

type PantryItem = {
  id: string;
  item_name: string;
  expired_date: string | null;
  freshness_status: string | null;
  freshness_score: number | null;
  quantity: number;
  icon: string;
  category_id: number | null;
  created_at: string | null;
  last_scanned_at: string | null;
};

// Peta nama buah/sayur ke emoji
const PRODUCE_EMOJI_MAP: Array<{ keywords: string[]; emoji: string }> = [
  { keywords: ["apel", "apple"], emoji: "🍎" },
  { keywords: ["pisang", "banana"], emoji: "🍌" },
  { keywords: ["jeruk", "orange"], emoji: "🍊" },
  { keywords: ["tomat", "tomato"], emoji: "🍅" },
  { keywords: ["wortel", "carrot"], emoji: "🥕" },
  { keywords: ["bayam", "spinach"], emoji: "🥬" },
  { keywords: ["brokoli", "broccoli"], emoji: "🥦" },
  { keywords: ["kangkung"], emoji: "🥬" },
  { keywords: ["selada", "lettuce"], emoji: "🥗" },
  { keywords: ["paprika", "pepper"], emoji: "🫑" },
  { keywords: ["mangga", "mango"], emoji: "🥭" },
  { keywords: ["anggur", "grape"], emoji: "🍇" },
  { keywords: ["stroberi", "strawberry"], emoji: "🍓" },
  { keywords: ["semangka", "watermelon"], emoji: "🍉" },
  { keywords: ["kentang", "potato"], emoji: "🥔" },
  { keywords: ["bawang", "onion"], emoji: "🧅" },
  { keywords: ["bawang putih", "garlic"], emoji: "🧄" },
  { keywords: ["jagung", "corn"], emoji: "🌽" },
  { keywords: ["cabai", "cabe", "chili"], emoji: "🌶️" },
  { keywords: ["timun", "mentimun", "cucumber"], emoji: "🥒" },
  { keywords: ["terong", "eggplant", "aubergine"], emoji: "🍆" },
  { keywords: ["labu", "pumpkin", "squash"], emoji: "🎃" },
  { keywords: ["alpukat", "avocado"], emoji: "🥑" },
  { keywords: ["nanas", "pineapple"], emoji: "🍍" },
  { keywords: ["kelapa", "coconut"], emoji: "🥥" },
  { keywords: ["lemon", "lime"], emoji: "🍋" },
  { keywords: ["pir", "pear"], emoji: "🍐" },
  { keywords: ["persik", "peach"], emoji: "🍑" },
  { keywords: ["ceri", "cherry"], emoji: "🍒" },
  { keywords: ["blueberry"], emoji: "🫐" },
  { keywords: ["melon"], emoji: "🍈" },
  { keywords: ["kiwi"], emoji: "🥝" },
  { keywords: ["pepaya", "papaya"], emoji: "🍈" },
  { keywords: ["durian"], emoji: "🍈" },
  { keywords: ["rambutan"], emoji: "🍈" },
  { keywords: ["jambu"], emoji: "🍈" },
  { keywords: ["nangka", "jackfruit"], emoji: "🍈" },
  { keywords: ["salak"], emoji: "🍈" },
  { keywords: ["daging", "meat", "beef", "sapi"], emoji: "🥩" },
  { keywords: ["ayam", "chicken"], emoji: "🍗" },
  { keywords: ["ikan", "fish"], emoji: "🐟" },
  { keywords: ["udang", "shrimp"], emoji: "🦐" },
  { keywords: ["telur", "egg"], emoji: "🥚" },
  { keywords: ["susu", "milk"], emoji: "🥛" },
  { keywords: ["keju", "cheese"], emoji: "🧀" },
  { keywords: ["mentega", "butter"], emoji: "🧈" },
  { keywords: ["roti", "bread"], emoji: "🍞" },
  { keywords: ["nasi", "rice", "beras"], emoji: "🍚" },
  { keywords: ["mie", "mie", "noodle"], emoji: "🍜" },
  { keywords: ["tahu"], emoji: "🟨" },
  { keywords: ["tempe", "tempeh"], emoji: "🟫" },
  { keywords: ["jamur", "mushroom"], emoji: "🍄" },
  { keywords: ["jahe", "ginger"], emoji: "🫚" },
  { keywords: ["kunyit", "turmeric"], emoji: "🟡" },
  { keywords: ["seledri", "celery"], emoji: "🌿" },
  { keywords: ["daun", "leaf", "herb"], emoji: "🌿" },
];

/**
 * Menghasilkan emoji otomatis berdasarkan nama buah/sayur.
 * Jika tidak cocok, kembalikan emoji default 📦.
 */
function getAutoEmoji(name: string): string {
  const lower = name.toLowerCase().trim();
  if (!lower) return "📦";
  for (const entry of PRODUCE_EMOJI_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.emoji;
    }
  }
  return "📦";
}

// Estimasi umur simpan (hari) berdasarkan nama item
const SHELF_LIFE_DAYS: Record<string, number> = {
  apel: 14, apple: 14,
  pisang: 5, banana: 5,
  jeruk: 10, orange: 10,
  tomat: 7, tomato: 7,
  wortel: 21, carrot: 21,
  bayam: 3, spinach: 3,
  brokoli: 5, broccoli: 5,
  kangkung: 2,
  selada: 5, lettuce: 5,
  paprika: 10, pepper: 10,
  mangga: 7, mango: 7,
  anggur: 7, grape: 7,
  stroberi: 3, strawberry: 3,
  semangka: 7, watermelon: 7,
  kentang: 28, potato: 28,
  bawang: 30, onion: 30,
};

function estimateExpiryDate(item: PantryItem): { date: Date; isEstimated: boolean } | null {
  if (item.expired_date) {
    return { date: new Date(item.expired_date), isEstimated: false };
  }
  const scanDate = item.last_scanned_at || item.created_at;
  if (!scanDate) return null;

  const name = item.item_name.toLowerCase();
  let shelfDays = 7; // default
  for (const [key, days] of Object.entries(SHELF_LIFE_DAYS)) {
    if (name.includes(key)) { shelfDays = days; break; }
  }

  // Kurangi umur simpan berdasarkan freshness
  const freshness = item.freshness_score;
  if (freshness != null) {
    shelfDays = Math.max(1, Math.round(shelfDays * (freshness / 100)));
  }

  const expiry = new Date(scanDate);
  expiry.setDate(expiry.getDate() + shelfDays);
  return { date: expiry, isEstimated: true };
}

export default function InventoryPage() {
  const { data: session, status } = useSession();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<PantryItem | null>(null);
  const [inventory, setInventory] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PantryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [useQty, setUseQty] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: "success" | "removed" } | null>(null);

  const showToast = (message: string, type: "success" | "removed") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };
  const [newItem, setNewItem] = useState({
    item_name: "",
    quantity: 1,
    freshness_status: "Segar",
    icon: "📦",
  });

  const fetchInventory = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("pantry_items")
        .select("*")
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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      const { error } = await supabase.from("pantry_items").insert([
        {
          ...newItem,
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          last_scanned_at: new Date().toISOString()
        }
      ]);

      if (error) throw error;

      setIsAddModalOpen(false);
      setNewItem({
        item_name: "",
        quantity: 1,
        freshness_status: "Segar",
        icon: "📦",
      });
      fetchInventory(session.user.id);
    } catch (err: any) {
      alert("Gagal menambah bahan: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUseItem = async () => {
    if (!deleteTarget) return;
    const qty = Math.max(1, Math.min(useQty, deleteTarget.quantity));
    const remaining = deleteTarget.quantity - qty;
    const itemName = deleteTarget.item_name;
    const itemIcon = deleteTarget.icon || "📦";

    try {
      setIsDeleting(true);

      if (remaining <= 0) {
        // Habis — hapus dari database
        const { error } = await supabase
          .from("pantry_items")
          .delete()
          .eq("id", deleteTarget.id);
        if (error) throw error;
        setInventory((prev) => prev.filter((i) => i.id !== deleteTarget.id));
        showToast(`${itemIcon} ${itemName} habis digunakan dan dihapus dari inventori`, "removed");
      } else {
        // Masih ada sisa — update quantity
        const { error } = await supabase
          .from("pantry_items")
          .update({ quantity: remaining })
          .eq("id", deleteTarget.id);
        if (error) throw error;
        setInventory((prev) =>
          prev.map((i) =>
            i.id === deleteTarget.id ? { ...i, quantity: remaining } : i
          )
        );
        showToast(`${itemIcon} ${qty} ${itemName} digunakan · sisa ${remaining} biji`, "success");
      }

      if (selected?.id === deleteTarget.id) setSelected(null);
      setDeleteTarget(null);
    } catch (err: any) {
      alert("Gagal mencatat penggunaan: " + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchInventory(session.user.id);
    }
  }, [session?.user?.id, status, fetchInventory]);

  // Normalisasi freshness_status ke label yang konsisten
  const normalizeFreshness = (status: string | null): string => {
    if (!status) return "Tidak Diketahui";
    const s = status.toLowerCase();
    if (s.includes("fresh") || s.includes("segar")) return "Segar";
    if (s.includes("decline") || s.includes("menurun") || s.includes("warning")) return "Menurun";
    return "Hampir busuk";
  };

  /**
   * Hitung status kesegaran dinamis berdasarkan sisa hari kadaluarsa.
   * Ini menggabungkan status awal dari DB dengan prediksi waktu,
   * sehingga kartu otomatis berubah seiring berjalannya waktu.
   */
  const getDynamicFreshness = (item: PantryItem): string => {
    const expiryInfo = estimateExpiryDate(item);
    if (expiryInfo) {
      const daysLeft = Math.ceil(
        (expiryInfo.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft < 0) return "Hampir busuk";
      if (daysLeft <= 2) return "Hampir busuk";
      if (daysLeft <= 5) return "Menurun";
      return "Segar";
    }
    // Fallback ke status dari DB jika tidak ada data tanggal
    return normalizeFreshness(item.freshness_status);
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

  // Hitung lebar bar berdasarkan quantity (max display = 10)
  const getStockBarWidth = (item: PantryItem): number => {
    const ratio = (item.quantity / 10) * 100;
    return Math.min(Math.max(ratio, 5), 100);
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
    (i) => getDynamicFreshness(i) === "Segar"
  ).length;
  const needCheckCount = inventory.filter(
    (i) => getDynamicFreshness(i) !== "Segar"
  ).length;

  return (
    <div className="space-y-8">
      {/* SEARCH BOX */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative group flex-1 w-full">
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
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-green-600 transition-all shadow-lg shadow-slate-200 hover:shadow-green-100"
        >
          <Plus size={18} /> Tambah Manual
        </button>
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
          const freshnessLabel = getDynamicFreshness(item);
          const expiryInfo = estimateExpiryDate(item);
          const daysLeft = expiryInfo
            ? Math.ceil((expiryInfo.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : null;
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

              {/* Sisa hari / skor */}
              <p className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-tighter">
                {daysLeft != null
                  ? daysLeft < 0
                    ? "⚠️ Sudah kadaluarsa"
                    : daysLeft === 0
                    ? "⚠️ Kadaluarsa hari ini"
                    : `📅 ${daysLeft} hari lagi`
                  : item.freshness_score != null
                  ? `Skor kesegaran: ${item.freshness_score.toFixed(0)}%`
                  : "Belum ada skor kesegaran"}
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setDeleteTarget(item); setUseQty(1); }}
                    className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Catat penggunaan"
                  >
                    <Trash2 size={14} />
                  </button>
                  <button
                    onClick={() => setSelected(item)}
                    className="text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-xl hover:bg-green-600 transition-colors uppercase tracking-widest"
                  >
                    Detail
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETAIL */}
      {selected && (() => {
        const expiryInfo = estimateExpiryDate(selected);
        const daysLeft = expiryInfo
          ? Math.ceil((expiryInfo.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null;
        const scanDate = selected.last_scanned_at || selected.created_at;
        const freshnessLabel = getDynamicFreshness(selected);

        // Warna urgency berdasarkan sisa hari
        const getExpiryColor = () => {
          if (daysLeft == null) return "text-slate-500";
          if (daysLeft < 0) return "text-red-600";
          if (daysLeft <= 2) return "text-red-500";
          if (daysLeft <= 5) return "text-amber-500";
          return "text-green-600";
        };
        const getExpiryBg = () => {
          if (daysLeft == null) return "bg-slate-50";
          if (daysLeft < 0) return "bg-red-50 border-red-100";
          if (daysLeft <= 2) return "bg-red-50 border-red-100";
          if (daysLeft <= 5) return "bg-amber-50 border-amber-100";
          return "bg-green-50 border-green-100";
        };

        return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[3rem] w-full max-w-md shadow-2xl space-y-5 border border-white max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-slate-100">
                {selected.icon || "📦"}
              </div>
              <div className="text-left">
                <h3 className="text-xl font-black text-slate-800 tracking-tighter">
                  {selected.item_name}
                </h3>
                <span
                  className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${getBadge(freshnessLabel)}`}
                >
                  {freshnessLabel}
                </span>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Jumlah</p>
                <p className="font-black text-slate-800">{selected.quantity} biji</p>
              </div>
            </div>

            {/* Scan & Expiry Timeline */}
            <div className={`p-4 rounded-2xl border ${getExpiryBg()} space-y-4`}>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Timer size={12} /> Timeline Kesegaran
              </p>

              {/* Tanggal Discan */}
              {scanDate && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar size={14} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Discan</p>
                    <p className="font-black text-slate-800 text-sm">
                      {new Date(scanDate).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400">
                      {new Date(scanDate).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              )}

              {/* Divider line */}
              {scanDate && expiryInfo && (
                <div className="flex items-center gap-2 pl-3.5">
                  <div className="w-0.5 h-6 bg-slate-200 rounded-full"></div>
                </div>
              )}

              {/* Prediksi Expired */}
              {expiryInfo && (
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    daysLeft != null && daysLeft <= 2 ? "bg-red-100" : daysLeft != null && daysLeft <= 5 ? "bg-amber-100" : "bg-green-100"
                  }`}>
                    <Clock size={14} className={getExpiryColor()} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                      Prediksi Expired
                      {expiryInfo.isEstimated && (
                        <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-black">EST</span>
                      )}
                    </p>
                    <p className={`font-black text-sm ${getExpiryColor()}`}>
                      {expiryInfo.date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <p className={`text-xs font-black mt-0.5 ${getExpiryColor()}`}>
                      {daysLeft != null && daysLeft < 0
                        ? `⚠️ Sudah lewat ${Math.abs(daysLeft)} hari`
                        : daysLeft === 0
                        ? "⚠️ Hari ini!"
                        : `📅 ${daysLeft} hari lagi`}
                    </p>
                  </div>
                </div>
              )}

              {/* Tidak ada data sama sekali */}
              {!scanDate && !expiryInfo && (
                <p className="text-xs font-bold text-slate-400 italic">Belum ada data scan untuk item ini.</p>
              )}
            </div>

            {/* Progress bar sisa hari */}
            {expiryInfo && scanDate && daysLeft != null && (() => {
              const totalDays = Math.ceil((expiryInfo.date.getTime() - new Date(scanDate).getTime()) / (1000 * 60 * 60 * 24));
              const elapsed = totalDays - daysLeft;
              const pct = totalDays > 0 ? Math.min(100, Math.max(0, (elapsed / totalDays) * 100)) : 100;
              return (
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase">
                    <span>Segar</span>
                    <span>Expired</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        pct >= 80 ? "bg-red-500" : pct >= 60 ? "bg-amber-400" : "bg-green-500"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* Skor Kesegaran */}
            {selected.freshness_score != null && (
              <div className="p-3 bg-slate-50 rounded-2xl text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Skor Kesegaran</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(freshnessLabel)} rounded-full`}
                      style={{ width: `${selected.freshness_score}%` }}
                    />
                  </div>
                  <span className="font-black text-slate-800 text-sm">
                    {selected.freshness_score.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Warning */}
            {freshnessLabel !== "Segar" && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 flex items-center gap-3 text-left">
                <AlertCircle size={18} />
                Bahan ini mulai tidak segar, segera gunakan!
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteTarget(selected);
                  setUseQty(1);
                  setSelected(null);
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
              >
                <Trash2 size={14} /> Hapus
              </button>
              <button
                onClick={() => setSelected(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL TAMBAH MANUAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-in fade-in zoom-in duration-300">
          <div className="bg-white p-10 rounded-[3rem] w-full max-w-lg shadow-2xl border border-white relative overflow-hidden">
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X size={20} />
            </button>

            <div className="mb-8">
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Tambah Bahan Baru</h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Masukkan detail stok pantry Anda</p>
            </div>

            <form onSubmit={handleAddItem} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nama Bahan</label>
                  <div className="flex gap-3 items-center">
                    {/* Preview emoji otomatis */}
                    <div className="w-14 h-14 flex-shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl border border-slate-100 shadow-inner select-none">
                      {newItem.icon}
                    </div>
                    <input
                      required
                      type="text"
                      placeholder="Contoh: Apel Merah"
                      value={newItem.item_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        setNewItem({
                          ...newItem,
                          item_name: name,
                          icon: getAutoEmoji(name),
                        });
                      }}
                      className="flex-1 px-5 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-2 ml-1">
                    Icon otomatis berdasarkan nama bahan
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Jumlah (Qty)</label>
                  <input 
                    type="number"
                    min={1}
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all outline-none"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-green-600 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
              >
                {loading ? "Menyimpan..." : "Simpan ke Inventori"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* MODAL CATAT PENGGUNAAN */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-white p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl border border-white space-y-6">

            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border border-green-100">
                {deleteTarget.icon || "📦"}
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Catat Penggunaan</p>
                <h3 className="text-lg font-black text-slate-800 tracking-tighter leading-tight">
                  {deleteTarget.item_name}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  Stok tersedia:{" "}
                  <span className="text-slate-700 font-black">{deleteTarget.quantity} biji</span>
                </p>
              </div>
            </div>

            {/* Input qty */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                Berapa yang digunakan?
              </label>

              {/* Stepper */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setUseQty((v) => Math.max(1, v - 1))}
                  disabled={useQty <= 1}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xl flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={deleteTarget.quantity}
                  value={useQty}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) || 1;
                    setUseQty(Math.max(1, Math.min(v, deleteTarget.quantity)));
                  }}
                  className="flex-1 text-center py-3 bg-slate-50 rounded-2xl font-black text-xl text-slate-800 outline-none focus:ring-4 focus:ring-green-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setUseQty((v) => Math.min(deleteTarget.quantity, v + 1))}
                  disabled={useQty >= deleteTarget.quantity}
                  className="w-12 h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xl flex items-center justify-center transition-colors disabled:opacity-30"
                >
                  +
                </button>
              </div>

              {/* Tombol pakai semua */}
              {useQty < deleteTarget.quantity && (
                <button
                  type="button"
                  onClick={() => setUseQty(deleteTarget.quantity)}
                  className="w-full text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest py-1 transition-colors"
                >
                  Gunakan semua ({deleteTarget.quantity} biji)
                </button>
              )}
            </div>

            {/* Preview hasil */}
            <div className={`p-4 rounded-2xl text-sm font-bold text-center ${
              useQty >= deleteTarget.quantity
                ? "bg-red-50 text-red-600 border border-red-100"
                : "bg-green-50 text-green-700 border border-green-100"
            }`}>
              {useQty >= deleteTarget.quantity ? (
                <span>🗑️ Stok <strong>{deleteTarget.item_name}</strong> akan habis dan dihapus dari inventori</span>
              ) : (
                <span>
                  ✅ Sisa stok:{" "}
                  <strong>{deleteTarget.quantity - useQty} biji</strong> tersimpan di inventori
                </span>
              )}
            </div>

            {/* Tombol aksi */}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-colors disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleUseItem}
                disabled={isDeleting}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                {isDeleting ? "Menyimpan..." : `Konfirmasi`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* TOAST NOTIFIKASI */}
      <div
        className={`fixed bottom-6 right-6 z-[200] transition-all duration-500 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        {toast && (
          <div
            className={`flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold max-w-xs ${
              toast.type === "removed"
                ? "bg-slate-900 text-white border-slate-700"
                : "bg-white text-slate-800 border-green-100 shadow-green-100/50"
            }`}
          >
            <span className="text-base leading-none">
              {toast.type === "removed" ? "🗑️" : "✅"}
            </span>
            <p className="leading-snug">{toast.message}</p>
            <button
              onClick={() => setToast(null)}
              className={`ml-1 flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ${
                toast.type === "removed" ? "text-white" : "text-slate-400"
              }`}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
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