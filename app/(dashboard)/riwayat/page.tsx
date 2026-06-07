"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Search,
  Loader2,
  PackageSearch,
  X,
  Camera,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Trash2,
  Filter,
  ArrowUpDown,
  CalendarDays,
} from "lucide-react";

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

type StatusFilter = "all" | "segar" | "busuk" | "mixed" | "empty";

type SortOption =
  | "newest"
  | "oldest"
  | "item_desc"
  | "item_asc"
  | "source_asc";

type DeletePeriod = "7" | "30" | "90" | "all" | "custom";
type DeletePeriodValue = DeletePeriod | "";

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateInput(date: string) {
  if (!date) return "-";

  const [year, month, day] = date.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return parsed.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function normalizeConfidence(confidence: number) {
  if (!Number.isFinite(confidence)) return 0;

  const percent = confidence <= 1 ? confidence * 100 : confidence;
  return Math.round(Math.max(0, Math.min(100, percent)));
}

function statusBadge(status: string) {
  if (status === "Segar") return "bg-green-50 text-green-600 border-green-100";
  if (status === "Busuk") return "bg-red-50 text-red-600 border-red-100";
  return "bg-slate-50 text-slate-500 border-slate-100";
}

function hasFreshOrRotten(session: ScanSession) {
  const hasFresh = session.detections.some(
    (d) => d.freshness_status === "Segar"
  );

  const hasRotten = session.detections.some(
    (d) => d.freshness_status === "Busuk"
  );

  return { hasFresh, hasRotten };
}

function getSessionItemCount(session: ScanSession) {
  if (session.detections && session.detections.length > 0) {
    return session.detections.length;
  }

  return session.item_count || 0;
}

function getSessionStatusType(session: ScanSession): StatusFilter {
  const { hasFresh, hasRotten } = hasFreshOrRotten(session);

  if (!hasFresh && !hasRotten) return "empty";
  if (hasFresh && hasRotten) return "mixed";
  if (hasFresh) return "segar";
  if (hasRotten) return "busuk";

  return "empty";
}

function getPeriodLabel(
  period: DeletePeriodValue,
  startDate?: string,
  endDate?: string
) {
  if (period === "7") return "lebih dari 7 hari";
  if (period === "30") return "lebih dari 30 hari";
  if (period === "90") return "lebih dari 90 hari";
  if (period === "all") return "semua riwayat scan";

  if (period === "custom") {
    return `dari ${formatDateInput(startDate || "")} sampai ${formatDateInput(
      endDate || ""
    )}`;
  }

  return "periode terpilih";
}

export default function RiwayatScanPage() {
  const { status } = useSession();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null
  );
  const [periodDeleting, setPeriodDeleting] = useState(false);

  const [sessions, setSessions] = useState<ScanSession[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [sortOption, setSortOption] = useState<SortOption>("newest");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePeriod, setDeletePeriod] = useState<DeletePeriodValue>("");
  const [deleteStartDate, setDeleteStartDate] = useState("");
  const [deleteEndDate, setDeleteEndDate] = useState("");

  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedSession, setSelectedSession] = useState<ScanSession | null>(
    null
  );
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setSyncing(true);

      const res = await fetch("/api/scan-sessions?limit=100", {
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("fetchHistory error:", err);
      alert("Gagal melakukan sync data riwayat scan.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "loading") {
      fetchHistory();
    }
  }, [status, fetchHistory]);

  const sourceOptions = useMemo(() => {
    const sources = Array.from(
      new Set(
        sessions
          .map((session) => session.device_source)
          .filter((source) => source && source.trim() !== "")
      )
    );

    return sources.sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const result = sessions.filter((s) => {
      const matchesSearch =
        !q ||
        s.id.toLowerCase().includes(q) ||
        formatDate(s.scanned_at).toLowerCase().includes(q) ||
        formatTime(s.scanned_at).toLowerCase().includes(q) ||
        s.device_source.toLowerCase().includes(q) ||
        s.detections.some((d) => d.item_name.toLowerCase().includes(q));

      const sessionStatus = getSessionStatusType(s);

      const matchesStatus =
        statusFilter === "all" || sessionStatus === statusFilter;

      const matchesSource =
        sourceFilter === "all" || s.device_source === sourceFilter;

      return matchesSearch && matchesStatus && matchesSource;
    });

    return [...result].sort((a, b) => {
      if (sortOption === "newest") {
        return (
          new Date(b.scanned_at).getTime() - new Date(a.scanned_at).getTime()
        );
      }

      if (sortOption === "oldest") {
        return (
          new Date(a.scanned_at).getTime() - new Date(b.scanned_at).getTime()
        );
      }

      if (sortOption === "item_desc") {
        return getSessionItemCount(b) - getSessionItemCount(a);
      }

      if (sortOption === "item_asc") {
        return getSessionItemCount(a) - getSessionItemCount(b);
      }

      if (sortOption === "source_asc") {
        return a.device_source.localeCompare(b.device_source);
      }

      return 0;
    });
  }, [sessions, search, statusFilter, sourceFilter, sortOption]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedSessions = filtered.slice(startIndex, endIndex);

  const shownStart = filtered.length === 0 ? 0 : startIndex + 1;
  const shownEnd = Math.min(endIndex, filtered.length);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedRows(new Set());
  }, [search, statusFilter, sourceFilter, sortOption, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openDeleteModal = () => {
    setDeletePeriod("");
    setDeleteStartDate("");
    setDeleteEndDate("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (periodDeleting) return;

    setShowDeleteModal(false);
    setDeletePeriod("");
    setDeleteStartDate("");
    setDeleteEndDate("");
  };

  const handleDeleteSession = async (sessionId: string) => {
    const confirmed = window.confirm(
      "Yakin ingin menghapus sesi scan ini? Data foto dan detail deteksi pada sesi tersebut akan dihapus."
    );

    if (!confirmed) return;

    try {
      setDeletingSessionId(sessionId);

      const res = await fetch(`/api/scan-sessions/${sessionId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      setTotal((prev) => Math.max(0, prev - 1));

      setExpandedRows((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });

      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
      }
    } catch (err) {
      console.error("delete session error:", err);
      alert("Gagal menghapus sesi scan. Pastikan endpoint DELETE sudah tersedia.");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleDeletePeriodic = async () => {
    let payload:
      | { mode: "all" }
      | { mode: "older_than_days"; days: number }
      | { mode: "date_range"; start_date: string; end_date: string };

    if (!deletePeriod) {
      alert("Pilih periode hapus terlebih dahulu.");
      return;
    }

    if (deletePeriod === "custom") {
      if (!deleteStartDate || !deleteEndDate) {
        alert("Pilih tanggal mulai dan tanggal akhir terlebih dahulu.");
        return;
      }

      const start = new Date(`${deleteStartDate}T00:00:00`);
      const end = new Date(`${deleteEndDate}T23:59:59`);

      if (start.getTime() > end.getTime()) {
        alert("Tanggal mulai tidak boleh lebih besar dari tanggal akhir.");
        return;
      }

      payload = {
        mode: "date_range",
        start_date: deleteStartDate,
        end_date: deleteEndDate,
      };
    } else if (deletePeriod === "all") {
      payload = { mode: "all" };
    } else {
      payload = {
        mode: "older_than_days",
        days: Number(deletePeriod),
      };
    }

    const label = getPeriodLabel(deletePeriod, deleteStartDate, deleteEndDate);

    const confirmed = window.confirm(
      `Yakin ingin menghapus riwayat scan ${label}? Tindakan ini tidak bisa dibatalkan.`
    );

    if (!confirmed) return;

    try {
      setPeriodDeleting(true);

      const res = await fetch("/api/scan-sessions", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      await fetchHistory();
      setExpandedRows(new Set());
      setSelectedSession(null);
      setCurrentPage(1);
      setShowDeleteModal(false);
      setDeletePeriod("");
      setDeleteStartDate("");
      setDeleteEndDate("");
    } catch (err) {
      console.error("periodic delete error:", err);
      alert(
        "Gagal menghapus riwayat scan secara periodik. Pastikan endpoint DELETE sudah tersedia dan mendukung mode date_range."
      );
    } finally {
      setPeriodDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setSortOption("newest");
    setCurrentPage(1);
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    setExpandedRows(new Set());
  };

  const visiblePageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxButtons = 5;

    let start = Math.max(1, safeCurrentPage - 2);
    let end = Math.min(totalPages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    for (let page = start; page <= end; page++) {
      pages.push(page);
    }

    return pages;
  }, [safeCurrentPage, totalPages]);

  const totalItems = sessions.reduce(
    (acc, s) => acc + getSessionItemCount(s),
    0
  );

  const rottenSessions = sessions.filter((s) =>
    s.detections.some((d) => d.freshness_status === "Busuk")
  ).length;

  const filteredTotalItems = filtered.reduce(
    (acc, s) => acc + getSessionItemCount(s),
    0
  );

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
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">
            Riwayat Scan
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
            {total} sesi tersimpan
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={fetchHistory}
            disabled={syncing || periodDeleting}
            className="inline-flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Syncing..." : "Sync / Refresh Data"}
          </button>

          <button
            type="button"
            onClick={openDeleteModal}
            disabled={periodDeleting || syncing || sessions.length === 0}
            className="inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 size={15} />
            Hapus Periodik
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="Total Sesi Scan" value={total} icon="📸" />
        <StatCard label="Total Objek Terdeteksi" value={totalItems} icon="🔍" />
        <StatCard
          label="Sesi Ada Busuk"
          value={rottenSessions}
          icon="⚠️"
          valueColor="text-red-500"
        />
      </div>

      <div className="bg-white border border-slate-100 rounded-[2rem] p-4 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-green-600" />
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
            Filter & Sorting
          </p>

          <button
            type="button"
            onClick={resetFilters}
            className="ml-auto text-[10px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-all"
          >
            Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          <div className="relative lg:col-span-1">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />

            <input
              type="text"
              placeholder="Cari tanggal, bahan, sumber, atau ID sesi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-medium text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-black text-xs uppercase tracking-widest text-slate-600"
          >
            <option value="all">Semua Status</option>
            <option value="segar">Hanya Segar</option>
            <option value="busuk">Hanya Busuk</option>
            <option value="mixed">Segar & Busuk</option>
            <option value="empty">Tanpa Objek</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-black text-xs uppercase tracking-widest text-slate-600"
          >
            <option value="all">Semua Sumber</option>
            {sourceOptions.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <div className="relative">
            <ArrowUpDown
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />

            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-[1.25rem] focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none transition-all font-black text-xs uppercase tracking-widest text-slate-600"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              <option value="item_desc">Item Terbanyak</option>
              <option value="item_asc">Item Paling Sedikit</option>
              <option value="source_asc">Sumber A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Menampilkan {shownStart}-{shownEnd} dari {filtered.length} sesi.
            Total objek terfilter: {filteredTotalItems}.
          </p>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Tampilkan
            </span>

            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-600 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>

            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              sesi
            </span>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
          <PackageSearch size={48} strokeWidth={1} />
          <p className="text-xs font-bold uppercase tracking-widest">
            {search || statusFilter !== "all" || sourceFilter !== "all"
              ? "Tidak ada sesi yang cocok dengan filter"
              : "Belum ada riwayat scan"}
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
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {paginatedSessions.map((sess) => {
                  const { hasFresh, hasRotten } = hasFreshOrRotten(sess);
                  const isExpanded = expandedRows.has(sess.id);
                  const itemCount = getSessionItemCount(sess);
                  const isDeleting = deletingSessionId === sess.id;

                  return (
                    <React.Fragment key={sess.id}>
                      <tr className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-6 py-4">
                          {sess.image_url ? (
                            <button
                              type="button"
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

                        <td className="px-4 py-4">
                          <p className="text-sm font-black text-slate-800">
                            {formatDate(sess.scanned_at)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                            {formatTime(sess.scanned_at)}
                          </p>
                          <p className="text-[10px] font-bold text-slate-300 mt-1">
                            {itemCount} objek
                          </p>
                        </td>

                        <td className="px-4 py-4 max-w-[260px]">
                          <div className="flex flex-wrap gap-1.5">
                            {sess.detections.slice(0, 4).map((d, i) => (
                              <span
                                key={i}
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase tracking-tight ${statusBadge(
                                  d.freshness_status
                                )}`}
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
                              <span className="text-[10px] text-slate-400 italic">
                                —
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span className="text-[10px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg uppercase tracking-widest">
                            {sess.device_source}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => toggleRow(sess.id)}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                          >
                            {isExpanded ? (
                              <ChevronUp size={18} />
                            ) : (
                              <ChevronDown size={18} />
                            )}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteSession(sess.id)}
                            disabled={isDeleting || periodDeleting}
                            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isDeleting ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Hapus
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${sess.id}-expand`} className="bg-slate-50/50">
                          <td colSpan={7} className="px-6 py-5">
                            {sess.detections.length === 0 ? (
                              <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-6">
                                Tidak ada detail objek pada sesi ini
                              </div>
                            ) : (
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
                                        className={`text-[10px] font-black px-2.5 py-1 rounded-full border uppercase ${statusBadge(
                                          det.freshness_status
                                        )}`}
                                      >
                                        {det.freshness_status}
                                      </span>
                                      <p className="text-[10px] font-bold text-slate-400 mt-1.5">
                                        {normalizeConfidence(det.confidence)}% conf
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-5 border-t border-slate-100 bg-slate-50/60">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Halaman {safeCurrentPage} dari {totalPages}. Menampilkan{" "}
              {shownStart}-{shownEnd} dari {filtered.length} sesi.
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-green-600 hover:border-green-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={15} />
                Prev
              </button>

              {visiblePageNumbers[0] > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goToPage(1)}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-green-600 hover:border-green-200 transition-all"
                  >
                    1
                  </button>
                  <span className="text-xs font-black text-slate-300">...</span>
                </>
              )}

              {visiblePageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => goToPage(page)}
                  className={`w-9 h-9 rounded-xl border text-xs font-black transition-all ${
                    page === safeCurrentPage
                      ? "bg-green-600 border-green-600 text-white"
                      : "bg-white border-slate-100 text-slate-500 hover:text-green-600 hover:border-green-200"
                  }`}
                >
                  {page}
                </button>
              ))}

              {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages && (
                <>
                  <span className="text-xs font-black text-slate-300">...</span>
                  <button
                    type="button"
                    onClick={() => goToPage(totalPages)}
                    className="w-9 h-9 rounded-xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-green-600 hover:border-green-200 transition-all"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-100 text-xs font-black text-slate-500 hover:text-green-600 hover:border-green-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div
          className="fixed inset-0 z-[110] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={closeDeleteModal}
        >
          <div
            className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black text-red-500 uppercase tracking-[0.25em] mb-2">
                  Hapus Periodik
                </p>

                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                  Pilih periode data yang ingin dihapus
                </h3>

                <p className="text-sm text-slate-400 font-medium mt-2">
                  Data sesi scan pada periode yang dipilih akan dihapus permanen.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={periodDeleting}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DeleteOptionButton
                  active={deletePeriod === "7"}
                  title="Lebih dari 7 hari"
                  desc="Hapus data lama"
                  disabled={periodDeleting}
                  onClick={() => {
                    setDeletePeriod("7");
                    setDeleteStartDate("");
                    setDeleteEndDate("");
                  }}
                />

                <DeleteOptionButton
                  active={deletePeriod === "30"}
                  title="Lebih dari 30 hari"
                  desc="Rekomendasi default"
                  disabled={periodDeleting}
                  onClick={() => {
                    setDeletePeriod("30");
                    setDeleteStartDate("");
                    setDeleteEndDate("");
                  }}
                />

                <DeleteOptionButton
                  active={deletePeriod === "90"}
                  title="Lebih dari 90 hari"
                  desc="Arsip sangat lama"
                  disabled={periodDeleting}
                  onClick={() => {
                    setDeletePeriod("90");
                    setDeleteStartDate("");
                    setDeleteEndDate("");
                  }}
                />

                <DeleteOptionButton
                  active={deletePeriod === "all"}
                  title="Hapus semua"
                  desc="Semua riwayat scan"
                  disabled={periodDeleting}
                  onClick={() => {
                    setDeletePeriod("all");
                    setDeleteStartDate("");
                    setDeleteEndDate("");
                  }}
                />

                <button
                  type="button"
                  onClick={() => setDeletePeriod("custom")}
                  disabled={periodDeleting}
                  className={`sm:col-span-2 p-4 rounded-2xl border text-left transition-all ${
                    deletePeriod === "custom"
                      ? "bg-red-50 border-red-300 text-red-600"
                      : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} />
                    <p className="text-sm font-black">Custom tanggal</p>
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
                    Pilih dari tanggal berapa sampai tanggal berapa
                  </p>
                </button>
              </div>

              {deletePeriod === "custom" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-red-50/60 border border-red-100 rounded-2xl">
                  <label className="space-y-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest">
                      <CalendarDays size={13} />
                      Dari Tanggal
                    </span>

                    <input
                      type="date"
                      value={deleteStartDate}
                      max={deleteEndDate || undefined}
                      onChange={(e) => setDeleteStartDate(e.target.value)}
                      disabled={periodDeleting}
                      className="w-full bg-white border border-red-100 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-red-500 uppercase tracking-widest">
                      <CalendarDays size={13} />
                      Sampai Tanggal
                    </span>

                    <input
                      type="date"
                      value={deleteEndDate}
                      min={deleteStartDate || undefined}
                      onChange={(e) => setDeleteEndDate(e.target.value)}
                      disabled={periodDeleting}
                      className="w-full bg-white border border-red-100 rounded-xl px-3 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
                    />
                  </label>

                  <p className="sm:col-span-2 text-[10px] font-bold text-red-400 uppercase tracking-widest">
                    Data yang dihapus:{" "}
                    {getPeriodLabel(
                      deletePeriod,
                      deleteStartDate,
                      deleteEndDate
                    )}
                    .
                  </p>
                </div>
              )}

              {deletePeriod && deletePeriod !== "custom" && (
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Data yang akan dihapus: {getPeriodLabel(deletePeriod)}.
                  </p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={periodDeleting}
                className="flex-1 px-5 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDeletePeriodic}
                disabled={periodDeleting || !deletePeriod}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {periodDeleting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
                {periodDeleting ? "Menghapus..." : "Hapus Data"}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSession && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-md flex items-center justify-center z-[100] p-4"
          onClick={() => setSelectedSession(null)}
        >
          <div
            className="bg-white rounded-[3rem] overflow-hidden shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <p className="font-black text-slate-800 text-sm">
                  {formatDate(selectedSession.scanned_at)}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {formatTime(selectedSession.scanned_at)} ·{" "}
                  {selectedSession.device_source}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto">
              {selectedSession.image_url && (
                <img
                  src={selectedSession.image_url}
                  alt="Foto scan"
                  className="w-full object-cover max-h-[400px]"
                />
              )}

              <div className="p-6 space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                  {selectedSession.detections.length} objek terdeteksi
                </p>

                {selectedSession.detections.length === 0 ? (
                  <div className="text-center text-xs text-slate-400 font-bold uppercase tracking-widest py-6">
                    Tidak ada objek terdeteksi
                  </div>
                ) : (
                  selectedSession.detections.map((det, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{det.icon}</span>
                        <div>
                          <p className="font-black text-slate-800 text-sm">
                            {det.item_name}
                          </p>
                          <p className="text-[10px] text-slate-400 uppercase font-bold">
                            {det.raw_label}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-400">
                          {normalizeConfidence(det.confidence)}%
                        </span>
                        <span
                          className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase ${statusBadge(
                            det.freshness_status
                          )}`}
                        >
                          {det.freshness_status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueColor = "text-slate-800",
}: {
  label: string;
  value: number | string;
  icon: string;
  valueColor?: string;
}) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform">
      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-2xl border border-slate-100">
        {icon}
      </div>

      <div>
        <p
          className={`text-3xl font-black tracking-tighter leading-none ${valueColor}`}
        >
          {value}
        </p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
          {label}
        </p>
      </div>
    </div>
  );
}

function DeleteOptionButton({
  active,
  title,
  desc,
  disabled,
  onClick,
}: {
  active: boolean;
  title: string;
  desc: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-2xl border text-left transition-all disabled:opacity-60 ${
        active
          ? "bg-red-50 border-red-300 text-red-600"
          : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"
      }`}
    >
      <p className="text-sm font-black">{title}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70">
        {desc}
      </p>
    </button>
  );
}