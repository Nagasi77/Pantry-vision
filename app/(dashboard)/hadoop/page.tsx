import fs from 'fs';
import path from 'path';
import React from 'react';
import SyncButton from './SyncButton';

type Detection = { [k: string]: any };

function normalizeLabel(it: Detection) {
  return (it.display_label ?? it.raw_label ?? 'Unknown') as string;
}

function normalizeConfidence(v: any) {
  const n = Number(v);
  if (Number.isNaN(n)) return undefined;
  if (n > 1 && n <= 100) return n;
  return n * 100;
}

export default async function HadoopPage() {
  const dir = path.join(process.cwd(), 'hdfs_sync');
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch (e) {
    files = [];
  }

  const data = files.map((f) => {
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      const parsed = JSON.parse(content);
      return { file: f, items: Array.isArray(parsed) ? parsed : [parsed] };
    } catch (e) {
      return { file: f, items: [] };
    }
  });

  const flat: Detection[] = data.flatMap((d) => d.items);
  const total = flat.length;
  const counts: Record<string, number> = {};
  let confSum = 0;
  let confCount = 0;

  flat.forEach((it) => {
    const label = normalizeLabel(it);
    counts[label] = (counts[label] || 0) + 1;
    const c = normalizeConfidence(it.confidence);
    if (c !== undefined) {
      confSum += c;
      confCount += 1;
    }
  });

  const uniqueLabels = Object.keys(counts).length;
  const topLabels = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const avgConfidence = confCount > 0 ? confSum / confCount : undefined;

  const recent = flat
    .slice()
    .sort((a, b) => {
      const ta = a.timestamp ? Date.parse(String(a.timestamp)) : 0;
      const tb = b.timestamp ? Date.parse(String(b.timestamp)) : 0;
      return tb - ta;
    })
    .slice(0, 10);

  // Daily trend last 14 days
  const dateCounts: Record<string, { count: number; confSum: number; confCount: number }> = {};
  flat.forEach((it) => {
    const ta = it.timestamp ? Date.parse(String(it.timestamp)) : NaN;
    if (!Number.isNaN(ta)) {
      const d = new Date(ta);
      const key = d.toISOString().slice(0, 10);
      const c = normalizeConfidence(it.confidence);
      if (!dateCounts[key]) dateCounts[key] = { count: 0, confSum: 0, confCount: 0 };
      dateCounts[key].count += 1;
      if (c !== undefined) {
        dateCounts[key].confSum += c;
        dateCounts[key].confCount += 1;
      }
    }
  });

  const days = 14;
  const today = new Date();
  const trend = Array.from({ length: days }).map((_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    const entry = dateCounts[key] || { count: 0, confSum: 0, confCount: 0 };
    const avg = entry.confCount > 0 ? entry.confSum / entry.confCount : undefined;
    return { date: key, count: entry.count, avgConfidence: avg };
  });

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Hadoop Data Summary</h1>
            <p className="text-gray-500 mt-1">
              Data dari sinkronisasi Supabase ke HDFS (folder <code className="bg-gray-100 px-1 rounded">hdfs_sync/</code>)
            </p>
          </div>
          <SyncButton />
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Detections" value={total} icon="🔍" color="emerald" />
          <StatCard title="Unique Labels" value={uniqueLabels} icon="🏷️" color="blue" />
          <StatCard title="Avg Confidence" value={avgConfidence ? `${avgConfidence.toFixed(1)}%` : 'N/A'} icon="📊" color="purple" />
          <StatCard title="Files Synced" value={files.length} icon="📁" color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Labels */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🏆</span> Top Labels
            </h2>
            {topLabels.length === 0 ? (
              <p className="text-gray-500">No data</p>
            ) : (
              <ul className="space-y-3">
                {topLabels.map(([label, count]) => {
                  const maxCount = topLabels[0][1];
                  const percentage = (count / maxCount) * 100;
                  return (
                    <li key={label}>
                      <div className="flex justify-between text-sm font-medium text-gray-700 mb-1">
                        <span>{label}</span>
                        <span>{count}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Recent Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span>🕒</span> Recent Detections
            </h2>
            {recent.length === 0 ? (
              <p className="text-gray-500">No recent items</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recent.map((it, i) => (
                  <li key={i} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-800">
                          {normalizeLabel(it)}
                        </p>
                        {it.timestamp && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(it.timestamp).toLocaleString()}
                          </p>
                        )}
                      </div>
                      {it.confidence && (
                        <span className="text-sm font-semibold text-emerald-600">
                          {normalizeConfidence(it.confidence)?.toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Trends Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📈</span> 14-Day Detection Trends
          </h2>
          {trend.length === 0 ? (
            <p className="text-gray-500">No trend data</p>
          ) : (
            <div className="space-y-3">
              {trend.map((t) => {
                const maxCount = Math.max(...trend.map(t => t.count), 1);
                const barWidth = (t.count / maxCount) * 100;
                return (
                  <div key={t.date} className="flex items-center gap-3">
                    <div className="w-24 text-xs font-mono text-gray-500">{t.date}</div>
                    <div className="flex-1">
                      <div className="relative h-8 w-full bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-emerald-500 rounded-full"
                          style={{ width: `${barWidth}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-800">
                          {t.count} detections {t.avgConfidence ? `(${t.avgConfidence.toFixed(1)}%)` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* All Files Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span>📄</span> All Synced Files ({data.length})
          </h2>
          {data.length === 0 ? (
            <p className="text-gray-500">No JSON files found in hdfs_sync/.</p>
          ) : (
            <div className="space-y-6">
              {data.map((d) => (
                <details key={d.file} className="group border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                  <summary className="cursor-pointer font-mono text-sm text-gray-700 hover:text-emerald-600 transition-colors list-none flex items-center gap-2">
                    <span className="inline-block w-5 h-5 text-center group-open:rotate-90 transition-transform">▶</span>
                    {d.file} ({d.items.length} items)
                  </summary>
                  <div className="mt-3 pl-7">
                    {d.items.length === 0 ? (
                      <p className="text-gray-500 text-sm">Empty or invalid JSON.</p>
                    ) : (
                      <ul className="space-y-2">
                        {d.items.map((it: Detection, idx: number) => (
                          <li key={idx} className="bg-gray-50 rounded-lg p-3 text-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-gray-800">
                                  {normalizeLabel(it)}
                                </span>
                                {it.timestamp && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(it.timestamp).toLocaleString()}
                                  </p>
                                )}
                                {it.image_path && (
                                  <p className="text-xs text-gray-400 truncate mt-1">{it.image_path}</p>
                                )}
                              </div>
                              {it.confidence && (
                                <span className="text-xs font-semibold text-emerald-600">
                                  {normalizeConfidence(it.confidence)?.toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// Komponen StatCard (light theme)
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: 'emerald' | 'blue' | 'purple' | 'orange' }) {
  const colorClasses = {
    emerald: 'bg-emerald-100 text-emerald-600',
    blue: 'bg-blue-100 text-blue-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}