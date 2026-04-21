"use client";

import { useState } from "react";

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
    <div className="flex h-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-64 h-screen sticky top-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
        <a href="/" className="flex items-center gap-2">
          <div className="h-16 flex items-center px-6 border-b border-gray-200">
            <h1 className="font-bold text-lg">Pantry Vision</h1>
          </div>
        </a>
        
        <nav className="flex-1 py-6">
          <p className="px-6 text-xs font-bold text-green-600 mb-2">Utama</p>
          <a href="/dashboard" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">Dashboard</a>
          <a href="/inventory" className="flex items-center px-6 py-3 bg-gray-100 border-l-4 border-green-600 text-green-700 font-bold">Inventori</a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">Sensor</a>
          <a href="/scan" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">Scan</a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">Riwayat Scan</a>

          <p className="px-6 text-xs font-bold text-gray-400 mb-2 mt-8">Akun</p>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">Profile</a>
          <a href="#" className="flex items-center px-6 py-3 text-gray-600 hover:bg-gray-50 font-medium">LogOut</a>
        </nav>
      </aside>

      {/* MAIN */}
      <main className="flex-1 overflow-y-auto">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <h2 className="text-xl font-medium">Inventory</h2>
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">👤</div>
        </header>

        <div className="p-8 space-y-6">

          {/* SEARCH */}
          <input
            type="text"
            placeholder="Cari bahan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-3 border rounded-xl"
          />

          {/* SUMMARY */}
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl shadow text-center">
              <p className="text-sm text-gray-500">Total Item</p>
              <p className="text-2xl font-bold">{dummyInventory.length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow text-center">
              <p className="text-sm text-gray-500">Segar</p>
              <p className="text-2xl font-bold">{dummyInventory.filter(i=>i.freshness==='Segar').length}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow text-center">
              <p className="text-sm text-gray-500">Perlu dicek</p>
              <p className="text-2xl font-bold">{dummyInventory.filter(i=>i.freshness!=='Segar').length}</p>
            </div>
          </div>

          {/* GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{item.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${getBadge(item.freshness)}`}>
                    {item.freshness}
                  </span>
                </div>

                <p className="text-sm text-gray-500 mb-2">
                  {item.weight} g • {item.calories} kkal
                </p>

                <div className="mb-3">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getBarColor(item.freshness)}`}
                      style={{ width: `${item.stock * 15}%` }}
                    ></div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-400">Stok: {item.stock}</span>
                  <button
                    onClick={() => setSelected(item)}
                    className="text-sm bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                  >
                    Detail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* MODAL DETAIL */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl w-96 space-y-4">
  <div className="flex items-center gap-4">
    <div className="w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">
      🍎
    </div>
    <div>
      <h3 className="text-lg font-bold">{selected.name}</h3>
      <p className="text-xs text-gray-500">{selected.freshness}</p>
    </div>
  </div>

  <div className="grid grid-cols-2 gap-3 text-sm">
    <p><b>Berat:</b> {selected.weight} g</p>
    <p><b>Kalori:</b> {selected.calories} kkal</p>
    <p><b>Stok:</b> {selected.stock}</p>
    <p><b>Status:</b> {selected.freshness}</p>
  </div>

  {/* ALERT */}
  {selected.freshness !== "Segar" && (
    <div className="bg-yellow-100 text-yellow-800 text-xs p-3 rounded-lg">
      ⚠️ Bahan ini mulai tidak segar, segera digunakan!
    </div>
  )}

  {/* REKOMENDASI */}
  <div>
    <p className="text-sm font-semibold mb-2">Saran Menu</p>
    <ul className="text-xs text-gray-600 space-y-1">
      <li>• Salad buah</li>
      <li>• Jus sehat</li>
      <li>• Smoothie</li>
    </ul>
  </div>

  <button
    onClick={() => setSelected(null)}
    className="w-full bg-gray-200 py-2 rounded-lg"
  >
    Tutup
  </button>
</div>
        </div>
      )}
    </div>
  );
}