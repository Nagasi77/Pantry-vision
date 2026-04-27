"use client";

import { useState, useEffect, useCallback } from "react";
import { Scan } from "lucide-react";

// ─── Types & Constants ───────────────────────────────────────────────────────
type FreshnessStatus = "fresh" | "medium" | "low";

interface FoodItem {
  id: number;
  emoji: string;
  name: string;
  weight: number;
  kcal: number;
  freshness: number;
  kelembaban: number;
  tekstur: number;
  warna: number;
  aroma: number;
  status: FreshnessStatus;
  gas: string;
  saran: string;
  scannedAt: string;
}

interface ScanEntry {
  emoji: string;
  name: string;
  time: string;
  pct: number;
  status: FreshnessStatus;
}

const STATUS_LABEL: Record<FreshnessStatus, string> = {
  fresh: "Segar",
  medium: "Cukup Segar",
  low: "Kurang Segar",
};

const STATUS_BG: Record<FreshnessStatus, string> = {
  fresh: "bg-green-100 text-green-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-red-100 text-red-800",
};

const INITIAL_FOODS: FoodItem[] = [
  { id: 0, emoji: "🍎", name: "Apel", weight: 150, kcal: 52, freshness: 85, kelembaban: 78, tekstur: 85, warna: 90, aroma: 80, status: "fresh", gas: "Normal", saran: "Pie apel, salad buah, konsumsi langsung", scannedAt: "09:58" },
  { id: 1, emoji: "🍌", name: "Pisang", weight: 120, kcal: 89, freshness: 42, kelembaban: 55, tekstur: 40, warna: 50, aroma: 35, status: "low", gas: "Fermentasi ringan", saran: "Banana bread, smoothie, pisang goreng", scannedAt: "10:25" },
];

const INITIAL_HISTORY: ScanEntry[] = [
  { emoji: "🍎", name: "Apel", time: "09:58", pct: 85, status: "fresh" },
  { emoji: "🍌", name: "Pisang", time: "10:25", pct: 42, status: "low" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function freshnessColor(pct: number) {
  if (pct >= 70) return "#16a34a";
  if (pct >= 45) return "#d97706";
  return "#dc2626";
}

function nowTime() {
  return new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function clamp(n: number) {
  return Math.max(5, Math.min(98, n));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Badge({ status, small }: { status: FreshnessStatus; small?: boolean }) {
  return (
    <span className={`inline-block rounded-full font-black uppercase ${small ? "px-2 py-0.5 text-[8px]" : "px-3 py-1 text-[10px]"} ${STATUS_BG[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function ReadingBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5 text-left">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
        <span className="text-slate-500">{label}</span>
        <span className="text-slate-800">{value}%</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full transition-all duration-1000" 
          style={{ width: `${value}%`, backgroundColor: freshnessColor(value) }} 
        />
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const color = freshnessColor(value);
  const label = STATUS_LABEL[value >= 70 ? "fresh" : value >= 45 ? "medium" : "low"];
  const circumference = 2 * Math.PI * 54;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg width="144" height="144" viewBox="0 0 144 144" className="-rotate-90">
          <circle cx="72" cy="72" r="54" fill="none" stroke="#f1f5f9" strokeWidth="12" />
          <circle
            cx="72" cy="72" r="54" fill="none"
            stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-black tracking-tighter" style={{ color }}>{value}%</span>
        </div>
      </div>
      <div className="flex flex-col items-center mt-3 text-center">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Tingkat Kesegaran</span>
        <span className="text-xs font-black uppercase tracking-widest mt-1" style={{ color }}>{label}</span>
      </div>
    </div>
  );
}

export default function SensorPage() {
  const [foods] = useState<FoodItem[]>(INITIAL_FOODS);
  const [selectedId, setSelectedId] = useState(0);
  const [history, setHistory] = useState<ScanEntry[]>(INITIAL_HISTORY);
  const [isScanning, setIsScanning] = useState(false);
  const [jarak, setJarak] = useState(7);

  const food = foods.find((f) => f.id === selectedId) ?? foods[0];

  useEffect(() => {
    const id = setInterval(() => setJarak(6 + Math.round(Math.random() * 3)), 2500);
    return () => clearInterval(id);
  }, []);

  const scanNew = useCallback(() => {
    if (isScanning) return;
    setIsScanning(true);
    setTimeout(() => {
      const val = clamp(food.freshness + Math.round((Math.random() - 0.5) * 14));
      setHistory((prev) => [
        { 
          emoji: food.emoji, 
          name: food.name, 
          time: nowTime(), 
          pct: val, 
          status: val >= 70 ? "fresh" : val >= 45 ? "medium" : "low" 
        },
        ...prev.slice(0, 4),
      ]);
      setIsScanning(false);
    }, 1600);
  }, [isScanning, food]);

  return (
    <div className="w-full space-y-8 pb-16">
      {/* FOOD SELECTOR */}
      <div className="flex gap-3">
        {foods.map((f) => (
          <button
            key={f.id}
            onClick={() => setSelectedId(f.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border ${
              selectedId === f.id
                ? "bg-green-600 text-white border-green-600 shadow-lg shadow-green-100"
                : "bg-white text-slate-500 border-slate-100 hover:border-green-300"
            }`}
          >
            <span>{f.emoji}</span> {f.name}
          </button>
        ))}
      </div>

      {/* SENSOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Berat</p>
          <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">{food.weight}g</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Stabil ±2g</p>
        </div>
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Gas / Aroma</p>
          <span className={`text-3xl font-black tracking-tighter block leading-none ${food.status === "fresh" ? "text-green-600" : "text-orange-500"}`}>
            {food.gas}
          </span>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Deteksi Udara Normal</p>
        </div>
        <div className="bg-white p-6 rounded-[2.2rem] border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Jarak Scan</p>
          <p className="text-3xl font-black tracking-tighter text-slate-800 leading-none">{jarak}cm</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase italic mt-2">Optimal: 5-10 cm</p>
        </div>
      </div>

      {/* GAUGE & INFO */}
      <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-green-500/5 blur-[120px] pointer-events-none" />
        
        <div className="flex items-center justify-center">
          <Gauge value={food.freshness} />
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-3xl font-black text-slate-800 tracking-tighter mb-2 leading-none">
              {food.emoji} {food.name}
            </h3>
            <div className="flex gap-2 flex-wrap">
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest">{food.weight}g</span>
              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[9px] font-black uppercase tracking-widest">{food.kcal} Kkal</span>
              <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-[9px] font-black uppercase tracking-widest">Dipindai Baru Saja</span>
            </div>
          </div>

          <div className="space-y-3">
            <ReadingBar label="Kelembaban" value={food.kelembaban} />
            <ReadingBar label="Tekstur" value={food.tekstur} />
            <ReadingBar label="Warna" value={food.warna} />
            <ReadingBar label="Aroma" value={food.aroma} />
          </div>

          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Saran Penggunaan</p>
            <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{food.saran}"</p>
          </div>
        </div>
      </div>

      {/* RIWAYAT & BUTTON */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-lg font-black text-slate-800 tracking-tighter uppercase">Aktivitas Pemindaian</h3>
          <button
            onClick={scanNew}
            disabled={isScanning}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-green-100 active:scale-95"
          >
            {isScanning ? (
              <>
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memindai...</span>
              </>
            ) : (
              <>
                <Scan size={14} />
                <span>Scan Baru</span>
              </>
            )}
          </button>
        </div>

        <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-sm p-8 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Riwayat Scan Hari Ini</p>
          <div className="divide-y divide-slate-50">
            {history.map((entry, i) => (
              <div key={i} className="flex items-center justify-between py-4 hover:bg-slate-50/50 transition-colors rounded-2xl px-2">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] font-bold text-slate-400 italic w-12">{entry.time}</span>
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl shadow-sm border border-white">{entry.emoji}</div>
                  <span className="text-sm font-black text-slate-800 tracking-tight">{entry.name}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-sm font-black block leading-none" style={{ color: freshnessColor(entry.pct) }}>{entry.pct}%</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase">Kesegaran</span>
                  </div>
                  <Badge status={entry.status} small />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}