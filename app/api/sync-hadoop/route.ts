/**
 * POST /api/sync-hadoop
 *
 * Dipanggil oleh SyncButton di halaman Hadoop.
 * Menjalankan kedua script Python sync secara berurutan:
 *   1. sync_supabase_to_hadoop.py  (Supabase → hdfs_sync/)
 *   2. sync_hadoop_to_web.py       (hdfs_sync/ → summary.json)
 *
 * Letakkan file ini di: app/api/sync-hadoop/route.ts
 */

import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { NextResponse } from 'next/server';

const execAsync = promisify(exec);

// Root folder proyek (sejajar package.json)
const PROJECT_ROOT = process.cwd();

// Path ke kedua script Python
const SCRIPT_SYNC  = path.join(PROJECT_ROOT, 'sync_supabase_to_hadoop.py');
const SCRIPT_WEB   = path.join(PROJECT_ROOT, 'sync_hadoop_to_web.py');

// Python executable — sesuaikan jika pakai venv
const PYTHON = process.env.PYTHON_BIN ?? 'python';

export async function POST() {
  const logs: string[] = [];

  try {
    // ── Step 1: Supabase → hdfs_sync/ ──────────────────────────────────────
    logs.push('▶ Step 1: sync_supabase_to_hadoop.py');
    try {
      const { stdout: out1, stderr: err1 } = await execAsync(
        `${PYTHON} "${SCRIPT_SYNC}"`,
        { cwd: PROJECT_ROOT, timeout: 60_000 }
      );
      if (out1) logs.push(out1.trim());
      if (err1) logs.push(`[stderr] ${err1.trim()}`);
      logs.push('✅ Step 1 selesai');
    } catch (err: any) {
      const msg = err?.stderr || err?.message || String(err);
      logs.push(`❌ Step 1 gagal: ${msg}`);
      // Jangan stop — coba step 2 tetap (mungkin hdfs_sync/ sudah ada dari run sebelumnya)
    }

    // ── Step 2: hdfs_sync/ → summary.json ─────────────────────────────────
    logs.push('▶ Step 2: sync_hadoop_to_web.py');
    const { stdout: out2, stderr: err2 } = await execAsync(
      `${PYTHON} "${SCRIPT_WEB}"`,
      { cwd: PROJECT_ROOT, timeout: 30_000 }
    );
    if (out2) logs.push(out2.trim());
    if (err2) logs.push(`[stderr] ${err2.trim()}`);
    logs.push('✅ Step 2 selesai');

    return NextResponse.json({
      ok: true,
      message: 'Sync berhasil',
      logs,
    });
  } catch (err: any) {
    const msg = err?.stderr || err?.message || String(err);
    logs.push(`❌ Error: ${msg}`);
    return NextResponse.json(
      { ok: false, message: msg, logs },
      { status: 500 }
    );
  }
}
