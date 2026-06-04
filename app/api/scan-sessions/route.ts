import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/**
 * GET /api/scan-sessions
 * Kembalikan semua sesi scan (riwayat), diurutkan dari terbaru.
 * Query param: ?limit=20&offset=0
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Ambil semua sesi — jika tabel belum ada, Supabase return error dengan code PGRST
    const { data: sessions, error: sessErr, count } = await supabase
      .from("scan_sessions")
      .select("*", { count: "exact" })
      .order("scanned_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Tabel belum ada atau kosong → kembalikan data kosong (bukan 500)
    if (sessErr) {
      console.warn("[/api/scan-sessions] scan_sessions query error:", sessErr.message);
      return NextResponse.json({ sessions: [], total: 0 });
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ sessions: [], total: 0 });
    }

    // Ambil semua deteksi untuk sesi-sesi tersebut dalam satu query
    const sessionIds = sessions.map((s) => s.id);
    const { data: detections, error: detErr } = await supabase
      .from("scan_detections")
      .select("*")
      .in("scan_session_id", sessionIds);

    // Jika tabel scan_detections belum ada, tetap lanjut dengan deteksi kosong
    if (detErr) {
      console.warn("[/api/scan-sessions] scan_detections query error:", detErr.message);
    }

    // Gabungkan deteksi ke tiap sesi
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
    console.error("[/api/scan-sessions] Unexpected error:", error);
    // Kembalikan data kosong agar halaman tetap bisa render
    return NextResponse.json({ sessions: [], total: 0 });
  }
}
