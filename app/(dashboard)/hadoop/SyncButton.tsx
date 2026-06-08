'use client';

import { useState } from 'react';

export default function SyncButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSync = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/sync-hadoop', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Sync berhasil! Halaman akan dimuat ulang...');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setMessage(`❌ Gagal: ${data.message}`);
      }
    } catch (err) {
      setMessage('❌ Error koneksi ke server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleSync}
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: loading ? '#ccc' : '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontWeight: 'bold',
        }}
      >
        {loading ? 'Syncing...' : 'Sync Hadoop'}
      </button>
      {message && <p style={{ marginTop: 8, fontSize: 14 }}>{message}</p>}
    </div>
  );
}