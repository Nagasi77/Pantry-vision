"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, AlertCircle, Camera, RefreshCw, Clock, PackageSearch } from "lucide-react";
import { useSession } from "next-auth/react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanSession = {
  id: string;
  scanned_at: string;
  image_url: string | null;
  device_source: string;
  item_count: number;
  gas_status: string | null;
  jarak_cm: number | null;
};

type ScanDetection = {
  id: string;
  scan_session_id: string;
  item_name: string;
  raw_label: string;
  freshness_status: "Segar" | "Busuk" | string;
  confidence: number;
  icon: string;
};

type InventoryItem = {
  item_name: string;
  icon: string;
  freshness_status: string;
  quantity: number;
  avg_confidence: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function aggregateDetections(detections: ScanDetection[]): InventoryItem[] {
  const map: Record<string, InventoryItem> = {};
  for (const d of detections) {
    if (!map[d.item_name]) {
      map[d.item_name] = {
        item_name: d.item_name,
        icon: d.icon,
        freshness_status: d.freshness_status,
        quantity: 0,
        avg_confidence: 0,
      };
    }
    map[d.item_name].quantity += 1;
    map[d.item_name].avg_confidence += d.confidence * 100;
    // Jika ada satu yang busuk, status jadi Busuk
    if (d.freshness_status === "Busuk") {
      map[d.item_name].freshness_status = "Busuk";
    }
  }
  return Object.values(map).map((item) => ({
    ...item,
    avg_confidence: Math.round(item.avg_confidence / item.quantity),
  }));
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  });
}

function freshnessColor(status: string) {
  if (status === "Segar") return "bg-green-100 text-green-700 border-green-200";
  if (status === "Busuk") return "bg-red-100 text-red-700 border-red-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function freshnessBar(status: string) {
  if (status === "Segar") return "bg-green-500";
  if (status === "Busuk") return "bg-red-500";
  return "bg-slate-400";
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InventoriPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ScanSession | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [imgExpanded, setImgExpanded] = useState(false);

  const fetchLatest = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/ai/iot-latest");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setSession(data.session ?? null);
      setItems(aggregateDetections(data.detections ?? []));
    } catch (err: any) {
      console.error("fetchLatest error:", err);
      setError("Gagal memuat data inventori: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "loading") {
      fetchLatest();
    }
  }, [status, fetchLatest]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (status === "loading" || (loading && !session)) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
          Memuat Inventori...
        </p>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex items-center gap-3 bg-red-50 text-red-600 p-5 rounded-2xl border border-red-100">
        <AlertCircle size={20} />
        <p className="text-sm font-bold">{error}</p>
      </div>
    );
  }

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-300 gap-4">
        <Camera size={56} strokeWidth={1} />
        <p className="font-bold text-sm uppercase tracking-widest text-center">
          Belum ada scan yang dilakukan
        </p>
        <p className="text-xs text-slate-400 text-center max-w-xs">
          Lakukan scan pertama dari halaman Sensor untuk mengisi inventori.
        </p>
      </div>
    );
  }

  const segarCount = items.filter((i) => i.freshness_status === "Segar").length;
  const busukCount = items.filter((i) => i.freshness_status === "Busuk").length;

  return (
    <div className="space-y-8 pb-12">

      {/* ── Header refresh ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Inventori Pantry</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            Hasil scan terakhir
          </p>
        </div>
        <button
          onClick={fetchLatest}
          disabled={loading}
          className="flex items-center gap-2 bg-white border border-slate-100 px-5 py-3 rounded-2xl text-xs font-black text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 uppercase tracking-widest"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* ── Foto Scan Terakhir ─────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </div>
            <span className="text-white font-black text-sm tracking-tight">
              Foto Scan Terakhir
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Clock size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {formatDate(session.scanned_at)} · {formatTime(session.scanned_at)}
            </span>
          </div>
        </div>

        {session.image_url ? (
          <div className="relative">
            <img
              src={session.image_url}
              alt="Foto scan pantry terakhir"
              className={`w-full object-cover cursor-pointer transition-all duration-500 ${
                imgExpanded ? "max-h-[600px]" : "max-h-[300px]"
              }`}
              onClick={() => setImgExpanded((v) => !v)}
            />
            <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
              {imgExpanded ? "Klik untuk perkecil" : "Klik untuk perbesar"}
            </div>
            {/* Sumber perangkat */}
            <div className="absolute top-3 left-3 bg-green-600/90 backdrop-blur-md text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
              {session.device_source}
            </div>
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-slate-600 flex-col gap-3">
            <Camera size={36} strokeWidth={1} />
            <p className="text-xs font-bold uppercase tracking-widest">Foto tidak tersedia</p>
          </div>
        )}

        {/* Metadata sensor */}
        {(session.gas_status || session.jarak_cm) && (
          <div className="px-6 py-4 grid grid-cols-2 gap-3 border-t border-white/5">
            {session.gas_status && (
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Gas</p>
                <p className={`text-sm font-black ${session.gas_status === "Normal" ? "text-green-400" : "text-red-400"}`}>
                  {session.gas_status}
                </p>
              </div>
            )}
            {session.jarak_cm != null && (
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Jarak</p>
                <p className="text-sm font-black text-white">{session.jarak_cm} cm</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard label="Total Item" value={items.length} color="text-slate-800" />
        <SummaryCard label="Segar" value={segarCount} color="text-green-600" />
        <SummaryCard label="Busuk / Perlu Dibuang" value={busukCount} color="text-red-500" />
      </div>

      {/* ── Daftar Item ────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
          <PackageSearch size={48} strokeWidth={1} />
          <p className="text-xs font-bold uppercase tracking-widest">
            Tidak ada objek terdeteksi pada scan ini
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => (
            <InventoryCard key={item.item_name} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
  label, value, color,
}: {
  label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm text-center hover:scale-[1.02] transition-transform">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-4xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
    </div>
  );
}

function InventoryCard({ item }: { item: InventoryItem }) {
  return (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-50 shadow-sm hover:border-slate-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-slate-100">
            {item.icon}
          </div>
          <div>
            <p className="font-black text-slate-800 leading-none tracking-tight">{item.item_name}</p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
              {item.quantity} terdeteksi
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tight border ${freshnessColor(item.freshness_status)}`}
        >
          {item.freshness_status}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
          <span>Keyakinan Model</span>
          <span>{item.avg_confidence}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${freshnessBar(item.freshness_status)}`}
            style={{ width: `${item.avg_confidence}%` }}
          />
        </div>
      </div>
    </div>
  );
}
