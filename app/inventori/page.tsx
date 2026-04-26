"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, Package, Activity, Scan, 
  History, User, LogOut, ChevronDown, ChevronRight, Search , AlertCircle
} from "lucide-react";

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
  const pathname = usePathname();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [user] = useState({ fullname: "Muhammad Dimas Ajie", email: "mahasiswa123@gmail.com" });

  const getInitial = (name: string) => name.charAt(0).toUpperCase()

  const filtered = dummyInventory.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const navItemStyle = (path: string) => 
    `flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 group ${
      pathname === path 
      ? "bg-green-600 text-white shadow-lg shadow-green-100 translate-x-1" 
      : "text-slate-500 hover:bg-slate-50 hover:text-green-600"
    }`;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      
      {/* ── SIDEBAR ── */}
      <aside className="fixed top-0 left-0 w-72 h-screen bg-white border-r border-slate-100 shadow-sm z-20 flex flex-col">
          <div className="h-20 flex items-center px-8 gap-3 border-b border-slate-50">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
              <Package className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-800">
              Pantry Vision
            </span>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1">
            <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">
              Menu Utama
            </p>

            <Link href="/dashboard" className={navItemStyle('/dashboard')}>
              <LayoutDashboard size={20}/> <span>Dashboard</span>
            </Link>

            <Link href="/inventori" className={navItemStyle('/inventori')}>
              <Package size={20}/> <span>Inventori</span>
            </Link>

            <Link href="/sensor" className={navItemStyle('/sensor')}>
              <Activity size={20}/> <span>Sensor</span>
            </Link>

            <Link href="/scan" className={navItemStyle('/scan')}>
              <Scan size={20}/> <span>Scan</span>
            </Link>

            <Link href="/riwayat" className={navItemStyle('/riwayat')}>
              <History size={20}/> <span>Riwayat Scan</span>
            </Link>

            <div className="pt-8 border-t border-slate-50 mt-4">
            <p className="px-4 text-[10px] font-bold text-slate-400 mb-4 uppercase tracking-[0.2em]">Akun</p>
            <Link href="/profile" className={navItemStyle('/profile')}><User size={20} /> <span>Profile</span></Link>
          </div>
          </nav>
        </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="ml-72 mt-20 flex-1 flex flex-col overflow-y-auto">
        <header className="fixed top-0 left-72 right-0 h-20 bg-white/80 backdrop-blur-md z-30 border-b border-slate-100 flex items-center justify-between px-10">
          <h2 className="text-xl font-black text-slate-800 tracking-tighter">Inventori</h2>
          
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
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-4 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="flex flex-col items-center text-center px-4 pb-4 border-b border-slate-50 mb-2">
                  <div className="w-12 h-12 bg-green-100 text-green-700 font-black rounded-2xl border-2 border-white flex items-center justify-center text-lg shadow-sm mb-3 uppercase">
                  {getInitial(user.fullname)}
                </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Akun Aktif</p>
                  <p className="text-sm font-black text-slate-800 truncate w-full">{user.fullname}</p>
                  <p className="text-[10px] text-slate-500 font-medium truncate w-full">{user.email}</p>
                </div>
                <div className="px-2">
                  <button onClick={() => router.push('/login')} className="w-full flex items-center gap-2.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-[11px] group">
                    <LogOut size={14} className="text-red-400 group-hover:text-red-500" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="p-10 space-y-8">
          {/* SEARCH BOX MODIFIED */}
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

          {/* SUMMARY CARDS (Style StatCard Dashboard) */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Item</p>
              <p className="text-3xl font-black text-slate-800">{dummyInventory.length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-green-400 uppercase tracking-widest mb-2">Segar</p>
              <p className="text-3xl font-black text-green-800">{dummyInventory.filter(i=>i.freshness==='Segar').length}</p>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center">
              <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-2">Perlu Dicek</p>
              <p className="text-3xl font-black text-red-800">{dummyInventory.filter(i=>i.freshness!=='Segar').length}</p>
            </div>
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
        </div>
      </main>

      {/* MODAL DETAIL (Premium Style) */}
      {selected && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
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
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Berat</p>
                <p className="font-black text-slate-800">{selected.weight} g</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Kalori</p>
                <p className="font-black text-slate-800">{selected.calories} kkal</p>
              </div>
            </div>

            {selected.freshness !== "Segar" && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold p-4 rounded-2xl border border-red-100 flex items-center gap-3">
                <AlertCircle size={18} />
                Bahan ini mulai tidak segar, segera gunakan!
              </div>
            )}

            <div>
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