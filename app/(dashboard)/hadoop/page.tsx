/**
 * app/hadoop/page.tsx
 *
 * Hadoop Data Summary page.
 * Membaca dari hdfs_sync/summary.json yang dihasilkan sync_hadoop_to_web.py.
 *
 * FIX dari versi sebelumnya:
 *   - Tidak lagi JSON.parse per file (NDJSON bukan array → error)
 *   - Baca satu summary.json saja → lebih cepat, tidak ada loop fs.readdir
 *   - field timestamp → scanned_at (sesuai Supabase schema)
 *   - display_label dari enriched sessions
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import SyncButton from './SyncButton';

// ── Types ──────────────────────────────────────────────────────────────────────
type TopLabel      = { label: string; count: number };
type TrendEntry    = { date: string; count: number; avgConfidence: number | null };
type DetectionItem = { item_name?: string; raw_label?: string; freshness_status?: string; confidence?: number; icon?: string };
type SessionItem   = {
  id?: string;
  timestamp?: string;
  display_label?: string;
  confidence?: number | null;
  device_source?: string;
  item_count?: number;
  has_rotten?: boolean;
  detections?: DetectionItem[];
};
type Summary = {
  generated_at:      string;
  total_detections:  number;
  total_sessions:    number;
  unique_labels:     number;
  avg_confidence:    number | null;
  files_count:       number;
  top_labels:        TopLabel[];
  trend_14d:         TrendEntry[];
  recent_sessions:   SessionItem[];
  files:             { file: string; size_kb: number }[];
};

// ── Data loader ────────────────────────────────────────────────────────────────
function loadSummary(): Summary {
  const summaryPath = path.join(process.cwd(), 'hdfs_sync', 'summary.json');
  try {
    const raw = fs.readFileSync(summaryPath, 'utf-8');
    return JSON.parse(raw) as Summary;
  } catch {
    // Return empty summary jika file belum ada (sebelum sync pertama)
    return {
      generated_at:     new Date().toISOString(),
      total_detections: 0,
      total_sessions:   0,
      unique_labels:    0,
      avg_confidence:   null,
      files_count:      0,
      top_labels:       [],
      trend_14d:        [],
      recent_sessions:  [],
      files:            [],
    };
  }
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function HadoopPage() {
  const s = loadSummary();
  const isEmpty = s.total_detections === 0 && s.total_sessions === 0;

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hadoop Data Summary</h1>
            <p className="text-gray-500 mt-1 text-sm">
              Data dari sinkronisasi Supabase → HDFS (
              <code className="bg-gray-100 px-1 rounded">hdfs_sync/summary.json</code>)
              {s.generated_at && (
                <span className="ml-2 text-gray-400">
                  · Diperbarui: {new Date(s.generated_at).toLocaleString('id-ID')}
                </span>
              )}
            </p>
          </div>
          <SyncButton />
        </div>

        {/* Empty state */}
        {isEmpty && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8 text-center">
            <p className="text-yellow-800 font-semibold text-lg">Belum ada data tersinkronisasi</p>
            <p className="text-yellow-600 text-sm mt-1">
              Klik tombol <strong>Sync Hadoop</strong> di atas untuk mulai sinkronisasi dari Supabase.
            </p>
          </div>
        )}

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Detections" value={s.total_detections}    icon="🔍" color="emerald" />
          <StatCard title="Total Sessions"   value={s.total_sessions}      icon="📷" color="blue"    />
          <StatCard title="Avg Confidence"   value={s.avg_confidence != null ? `${s.avg_confidence.toFixed(1)}%` : 'N/A'} icon="📊" color="purple" />
          <StatCard title="Unique Labels"    value={s.unique_labels}        icon="🏷️" color="orange"  />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Top Labels */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🏆</span> Top Labels
            </h2>
            {s.top_labels.length === 0 ? (
              <p className="text-gray-400 text-sm">Belum ada data</p>
            ) : (
              <ul className="space-y-3">
                {s.top_labels.slice(0, 8).map(({ label, count }) => {
                  const maxCount = s.top_labels[0].count;
                  return (
                    <li key={label}>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>{label}</span>
                        <span className="text-gray-500">{count}×</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all"
                          style={{ width: `${(count / maxCount) * 100}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🕒</span> Recent Sessions
            </h2>
            {s.recent_sessions.length === 0 ? (
              <p className="text-gray-400 text-sm">Belum ada data</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {s.recent_sessions.slice(0, 10).map((sess, i) => (
                  <li key={sess.id ?? i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">
                          {sess.display_label ?? '—'}
                          {sess.has_rotten && (
                            <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Busuk</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {sess.device_source && <span className="mr-2">{sess.device_source}</span>}
                          {sess.timestamp && new Date(sess.timestamp).toLocaleString('id-ID')}
                        </p>
                        {/* Inline detection pills */}
                        {sess.detections && sess.detections.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {sess.detections.slice(0, 4).map((d, di) => (
                              <span
                                key={di}
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  d.freshness_status === 'Busuk'
                                    ? 'bg-red-50 text-red-600'
                                    : 'bg-green-50 text-green-700'
                                }`}
                              >
                                {d.icon} {d.item_name ?? d.raw_label}
                              </span>
                            ))}
                            {sess.detections.length > 4 && (
                              <span className="text-[10px] text-gray-400">+{sess.detections.length - 4} lagi</span>
                            )}
                          </div>
                        )}
                      </div>
                      {sess.confidence != null && (
                        <span className="text-sm font-semibold text-emerald-600 shrink-0">
                          {(sess.confidence > 1 ? sess.confidence : sess.confidence * 100).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 14-Day Trend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📈</span> 14-Day Detection Trends
          </h2>
          {s.trend_14d.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada data</p>
          ) : (
            <div className="space-y-2">
              {s.trend_14d.map((t) => {
                const maxCount = Math.max(...s.trend_14d.map((x) => x.count), 1);
                return (
                  <div key={t.date} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-mono text-gray-400 shrink-0">{t.date}</div>
                    <div className="flex-1 relative h-7 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-emerald-400 rounded-full transition-all"
                        style={{ width: `${(t.count / maxCount) * 100}%` }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-gray-700">
                        {t.count > 0
                          ? `${t.count} scan${t.avgConfidence ? ` · ${t.avgConfidence}%` : ''}`
                          : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Files list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📁</span> Synced Files ({s.files.length})
          </h2>
          {s.files.length === 0 ? (
            <p className="text-gray-400 text-sm">Belum ada file tersinkronisasi.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {s.files.map((f) => (
                <li key={f.file} className="py-2 flex justify-between text-sm">
                  <span className="font-mono text-gray-600">{f.file}</span>
                  <span className="text-gray-400">{f.size_kb} KB</span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </main>
  );
}

// ── StatCard ───────────────────────────────────────────────────────────────────
function StatCard({
  title, value, icon, color,
}: {
  title: string;
  value: string | number;
  icon: string;
  color: 'emerald' | 'blue' | 'purple' | 'orange';
}) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue:    'bg-blue-100 text-blue-600',
    purple:  'bg-purple-100 text-purple-600',
    orange:  'bg-orange-100 text-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
