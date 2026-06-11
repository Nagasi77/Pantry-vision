'use client';

import { useState } from 'react';

type SyncResult = {
  ok: boolean;
  message: string;
  logs?: string[];
};

export default function SyncButton() {
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState<SyncResult | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const handleSync = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res  = await fetch('/api/sync-hadoop', { method: 'POST' });
      const data = await res.json() as SyncResult;
      setResult(data);

      if (data.ok) {
        // Reload setelah 2 detik agar summary.json yang baru terbaca
        setTimeout(() => window.location.reload(), 2000);
      }
    } catch {
      setResult({ ok: false, message: 'Tidak dapat terhubung ke server' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleSync}
        disabled={loading}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all
          ${loading
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95'
          }`}
      >
        {loading ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Syncing...
          </>
        ) : (
          <>
            <span>🔄</span> Sync Hadoop
          </>
        )}
      </button>

      {result && (
        <div className={`text-sm rounded-xl px-4 py-2 max-w-sm text-right
          ${result.ok
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <p className="font-medium">
            {result.ok ? '✅ ' : '❌ '}{result.message}
          </p>
          {result.ok && (
            <p className="text-xs text-emerald-500 mt-0.5">Halaman akan dimuat ulang...</p>
          )}

          {/* Toggle log detail */}
          {result.logs && result.logs.length > 0 && (
            <button
              onClick={() => setShowLogs((v) => !v)}
              className="text-xs underline mt-1 opacity-60 hover:opacity-100"
            >
              {showLogs ? 'Sembunyikan log' : 'Lihat log'}
            </button>
          )}
        </div>
      )}

      {/* Log detail */}
      {showLogs && result?.logs && (
        <div className="w-80 bg-gray-900 text-gray-200 rounded-xl p-3 text-xs font-mono max-h-48 overflow-y-auto">
          {result.logs.map((line, i) => (
            <div key={i} className="leading-5">{line}</div>
          ))}
        </div>
      )}
    </div>
  );
}
