"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Search, Loader2, PackageSearch, X, Camera,
  CheckCircle2, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanDetection = {
  id: string;
  scan_session_id: string;
  item_name: string;
  raw_label: string;
  freshness_status: string;
  confidence: number;
  icon: string;
};

type ScanSession = {
  id: string;
  scanned_at: string;
  image_url: string | null;
  device_source: string;
  item_count: number;
  gas_status: string | null;
  jarak_cm: number | null;
  detections: ScanDetection[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  });
}

function statusBadge(status: string) {
  if (status === "Segar") return "bg-green-50 text-green-600 border-green-100";
  if (status === "Busuk") return "bg-red-50 text-red-600 border-red-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
}

function hasFreshOrRotten(session: ScanSession) {
  const hasFresh = session.detections.some((d) => d.freshness_status === "Segar");
  const hasRotten = session.detections.some((d) => d.freshness_status === "Busuk");
  return { hasFresh, hasRotten };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function RiwayatScanPage() {
  const { status } = useSession();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/scan-sessions?limit=100");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("fetchHistory error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "loading") fetchHistory();
  }, [status, fetchHistory]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) =>
      s.id.toLowerCase().includes(q) ||
      formatDate(s.scanned_at).toLowerCase().includes(q) ||
      s.detections.some((d) => d.item_name.toLowerCase().includes(q))
    );
  }, [sessions, search]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Stats
  const totalItems = sessions.reduce((acc, s) => acc + s.item_count, 0);
  const rottenSessions = sessions.filter((s) =>
    s.detections.some((d) => d.freshness_status === "Busuk")
  ).length;

  if (status === "loading" || (loading && sessions.length === 0)) {
    return (
      <div className="flex h-[60vh] items-center justify-center flex-col gap-4">
        <Loader2 className="w-10 h-10 text-green-600 animate-spin" />
        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
          Memuat Riwayat Scan...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Scan</h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
          {total} sesi tersimpan
        </p>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Total Sesi Scan" value={total} icon="📸" />
        <StatCard label="Total Objek Terdeteksi" value={totalItems} icon="🔍" />
        <StatCard label="Sesi Ada Busuk" value={rottenSessions} icon="⚠️" valueColor="text-red-500" />
      </div>

      {/* ── Search ──────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Cari tanggal, nama bahan, atau ID sesi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-sm"
        />
      </div>

      {/* ── Tabel ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
          <PackageSearch size={48} strokeWidth={1} />
          <p className="text-xs font-bold uppercase tracking-widest">
            {search ? "Tidak ada sesi yang cocok" : "Belum ada riwayat scan"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Foto
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Waktu Scan
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Bahan Terdeteksi
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Status
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Sumber
                  </th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((sess) => {
                  const { hasFresh, hasRotten } = hasFreshOrRotten(sess);
                  const isExpanded = expandedRows.has(sess.id);

                  return (
                    <React.Fragment key={sess.id}>
                      <tr
                        className="hover:bg-slate-50/30 transition-colors group"
                      >
                        {/* Foto thumbnail */}
                        <td className="px-6 py-4">
                          {sess.image_url ? (
                            <button
                              onClick={() => setSelectedSession(sess)}
                              className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:scale-105 transition-transform flex-shrink-0 block"
                            >
                              <img
                                src={sess.image_url}
                                alt="Foto scan"
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                              <Camera size={20} />
                            </div>
                          )}
                        </td>

                        {/* Waktu */}
                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-slate-800">
                            {formatDate(sess.scanned_at)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {formatTime(sess.scanned_at)}
                          </p>
                        </td>

                        {/* Bahan — chip ringkas */}
                        <td className="px-4 py-4 max-w-[260px]">
                          <div className="flex flex-wrap gap-1.5">
                            {sess.detections.slice(0, 4).map((d, i) => (
                              <span
                                key={i}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-tight ${statusBadge(d.freshness_status)}`}
                              >
                                {d.icon} {d.item_name}
                              </span>
                            ))}
                            {sess.detections.length > 4 && (
                              <span className="text-[10px] font-black px-2.5 py-1 rounded-full border bg-slate-50 text-slate-500 border-slate-100 uppercase">
                                +{sess.detections.length - 4} lagi
                              </span>
                            )}
                            {sess.detections.length === 0 && (
                              <span className="text-[10px] text-slate-400 italic">
                                Tidak ada objek
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Status keseluruhan */}
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            {hasFresh && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-green-600">
                                <CheckCircle2 size={12} /> Ada Segar
                              </span>
                            )}
                            {hasRotten && (
                              <span className="flex items-center gap-1 text-[10px] font-black text-red-500">
                                <AlertCircle size={12} /> Ada Busuk
                              </span>
                            )}
                            {!hasFresh && !hasRotten && (
                              <span className="text-[10px] text-slate-400 italic">—</span>
                            )}
                          </div>
                        </td>

                        {/* Sumber */}
                        <td className="px-4 py-4">
                          <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg uppercase tracking-widest">
                            {sess.device_source}
                          </span>
                        </td>

                        {/* Expand / detail */}
                        <td className="px-4 py-4 text-center">
                          <button
                            onClick={() => toggleRow(sess.id)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                          >
                            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </button>
                        </td>
                      </tr>

                      {/* ── Expanded row ── */}
                      {isExpanded && (
                        <tr key={`${sess.id}-expand`} className="bg-slate-50/50">
                          <td colSpan={6} className="px-6 py-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {sess.detections.map((det, i) => (
                                <div
                                  key={i}
                                  className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm"
                                >
                                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-xl border border-slate-100">
                                    {det.icon}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-black text-slate-800 text-sm leading-none">
                                      {det.item_name}
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-1">
                                      {det.raw_label}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <span
                                      className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase ${statusBadge(det.freshness_status)}`}
                                    >
                                      {det.freshness_status}
                                    </span>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1.5">
                                      {Math.round(det.confidence * 100)}% conf
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Modal foto fullscreen ────────────────────────────────────────── */}
      {selectedSession && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-[3rem] overflow-hidden shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <p className="font-black text-slate-800 text-sm">
                  {formatDate(selectedSession.scanned_at)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {formatTime(selectedSession.scanned_at)} · {selectedSession.device_source}
                </p>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto">
              {/* Foto */}
              {selectedSession.image_url && (
                <img
                  src={selectedSession.image_url}
                  alt="Foto scan"
                  className="w-full object-cover max-h-[400px]"
                />
              )}

              {/* Deteksi list */}
              <div className="p-6 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  {selectedSession.detections.length} objek terdeteksi
                </p>
                {selectedSession.detections.map((det, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{det.icon}</span>
                      <div>
                        <p className="font-black text-slate-800 text-sm">{det.item_name}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">
                          {det.raw_label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-400">
                        {Math.round(det.confidence * 100)}%
                      </span>
                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase ${statusBadge(det.freshness_status)}`}
                      >
                        {det.freshness_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, icon, valueColor = "text-slate-800",
}: {
  label: string; value: number | string; icon: string; valueColor?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100">
        {icon}
      </div>
      <div>
        <p className={`text-3xl font-black tracking-tighter leading-none ${valueColor}`}>
          {value}
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
          {label}
        </p>
      </div>
    </div>
  );
}
