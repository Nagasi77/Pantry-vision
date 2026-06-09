import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Force route handler to never be cached by Next.js
export const dynamic = "force-dynamic";

// Gunakan service role key agar bisa hapus file dari Storage
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "scan_images";

/**
 * Ekstrak nama file dari Supabase Storage public URL.
 * Format URL: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<filename>
 */
function extractStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const parts = url.pathname.split(`/public/${STORAGE_BUCKET}/`);
    if (parts.length === 2 && parts[1]) {
      return decodeURIComponent(parts[1]);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Hapus file-file di storage untuk sejumlah sessions.
 * Tiap session bisa punya scan_{id}.jpg dan annotated_{id}.jpg.
 */
async function deleteStorageFiles(sessions: { id: string; image_url: string | null }[]) {
  const paths: string[] = [];

  for (const s of sessions) {
    if (s.image_url) {
      const p = extractStoragePath(s.image_url);
      if (p) paths.push(p);
    }
    // Selalu coba hapus annotated juga
    paths.push(`scan_${s.id}.jpg`);
    paths.push(`annotated_${s.id}.jpg`);
  }

  if (paths.length === 0) return;

  // Supabase storage remove maksimal ~1000 file per request, batch jika perlu
  const BATCH = 500;
  for (let i = 0; i < paths.length; i += BATCH) {
    const batch = paths.slice(i, i + BATCH);
    const { error } = await supabase.storage.from(STORAGE_BUCKET).remove(batch);
    if (error) console.warn("Storage batch delete warning:", error.message);
  }
}

// GET /api/scan-sessions?limit=50&offset=0
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { data: sessions, error: sessErr, count } = await supabase
      .from("scan_sessions")
      .select("*", { count: "exact" })
      .order("scanned_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (sessErr) {
      console.warn("GET scan_sessions error:", sessErr.message);
      return NextResponse.json({ sessions: [], total: 0 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [], total: 0 });
    }

    const sessionIds = sessions.map((s) => s.id);
    const { data: detections, error: detErr } = await supabase
      .from("scan_detections")
      .select("*")
      .in("scan_session_id", sessionIds);

    if (detErr) {
      console.warn("GET scan_detections error:", detErr.message);
    }

    const detMap: Record<string, any[]> = {};
    for (const det of detections || []) {
      if (!detMap[det.scan_session_id]) detMap[det.scan_session_id] = [];
      detMap[det.scan_session_id].push(det);
    }

    const result = sessions.map((s) => ({
      ...s,
      detections: detMap[s.id] || [],
    }));

    return NextResponse.json({ sessions: result, total: count || 0 });
  } catch (error) {
    console.error("GET /api/scan-sessions error:", error);
    return NextResponse.json({ sessions: [], total: 0 });
  }
}

// DELETE /api/scan-sessions
// Body: { mode: "all" } | { mode: "older_than", value: number, unit: "days"|"hours" } | { mode: "date_range", start_date: string, end_date: string }
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { mode } = body;

    if (mode === "all") {
      // Ambil semua session dulu untuk hapus storage
      const { data: allSessions } = await supabase
        .from("scan_sessions")
        .select("id, image_url");

      if (allSessions && allSessions.length > 0) {
        await deleteStorageFiles(allSessions);
        const ids = allSessions.map((s) => s.id);
        // Hapus child tables sebelum parent (urutan penting karena foreign key)
        await supabase.from("pantry_items").delete().in("scan_session_id", ids);
        await supabase.from("scan_detections").delete().in("scan_session_id", ids);
      }

      const { error } = await supabase.from("scan_sessions").delete().neq("id", "");
      if (error) throw error;
      return NextResponse.json({ success: true, message: "Semua riwayat scan dihapus" });
    }

    if (mode === "older_than") {
      const { value, unit } = body;
      if (!value || !unit || (unit !== "days" && unit !== "hours")) {
        return NextResponse.json(
          { error: "Parameter value dan unit (days/hours) wajib untuk mode older_than" },
          { status: 400 }
        );
      }

      const now = new Date();
      let cutoffDate: Date;
      if (unit === "days") {
        cutoffDate = new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
      } else {
        cutoffDate = new Date(now.getTime() - value * 60 * 60 * 1000);
      }

      // Ambil sessions yang akan dihapus
      const { data: toDelete } = await supabase
        .from("scan_sessions")
        .select("id, image_url")
        .lt("scanned_at", cutoffDate.toISOString());

      if (toDelete && toDelete.length > 0) {
        await deleteStorageFiles(toDelete);
        const ids = toDelete.map((s) => s.id);
        // Hapus child tables sebelum parent (urutan penting karena foreign key)
        await supabase.from("pantry_items").delete().in("scan_session_id", ids);
        await supabase.from("scan_detections").delete().in("scan_session_id", ids);
      }

      const { error } = await supabase
        .from("scan_sessions")
        .delete()
        .lt("scanned_at", cutoffDate.toISOString());

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Hapus sesi lebih dari ${value} ${unit}` });
    }

    if (mode === "date_range") {
      const { start_date, end_date } = body;
      if (!start_date || !end_date) {
        return NextResponse.json(
          { error: "start_date dan end_date wajib untuk mode date_range" },
          { status: 400 }
        );
      }

      const start = new Date(`${start_date}T00:00:00.000Z`);
      const end = new Date(`${end_date}T23:59:59.999Z`);

      // Ambil sessions yang akan dihapus
      const { data: toDelete } = await supabase
        .from("scan_sessions")
        .select("id, image_url")
        .gte("scanned_at", start.toISOString())
        .lte("scanned_at", end.toISOString());

      if (toDelete && toDelete.length > 0) {
        await deleteStorageFiles(toDelete);
        const ids = toDelete.map((s) => s.id);
        // Hapus child tables sebelum parent (urutan penting karena foreign key)
        await supabase.from("pantry_items").delete().in("scan_session_id", ids);
        await supabase.from("scan_detections").delete().in("scan_session_id", ids);
      }

      const { error } = await supabase
        .from("scan_sessions")
        .delete()
        .gte("scanned_at", start.toISOString())
        .lte("scanned_at", end.toISOString());

      if (error) throw error;
      return NextResponse.json({ success: true, message: `Hapus sesi antara ${start_date} - ${end_date}` });
    }

    return NextResponse.json({ error: "Mode tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("DELETE /api/scan-sessions error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus riwayat scan" },
      { status: 500 }
    );
  }
}