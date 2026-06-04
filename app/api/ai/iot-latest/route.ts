import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AZURE_API_URL = process.env.AZURE_SERVER_URL || "http://localhost:8000";
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

/**
 * GET /api/ai/iot-latest
 * Kembalikan sesi scan terakhir + daftar deteksi untuk halaman inventori & sensor.
 * Prioritas: Supabase langsung (lebih cepat), fallback ke Azure.
 */
export async function GET(_req: NextRequest) {
  try {
    // 1. Ambil session terbaru
    const { data: session, error: sessionErr } = await supabase
      .from("scan_sessions")
      .select("*")
      .order("scanned_at", { ascending: false })
      .limit(1)
      .single();

    if (sessionErr || !session) {
      // Tabel belum ada atau memang kosong — fallback ke Azure, lalu return kosong
      try {
        const azureRes = await fetch(`${AZURE_API_URL}/predict/latest-session`);
        if (azureRes.ok) {
          return NextResponse.json(await azureRes.json());
        }
      } catch (_) {
        // Azure tidak tersedia, tidak apa-apa
      }
      return NextResponse.json({ session: null, detections: [] });
    }

    // 2. Ambil deteksi dari sesi tersebut
    const { data: detections, error: detErr } = await supabase
      .from("scan_detections")
      .select("*")
      .eq("scan_session_id", session.id);

    if (detErr) {
      console.warn("[/api/ai/iot-latest] scan_detections error:", detErr.message);
    }

    return NextResponse.json({
      session,
      detections: detections || [],
    });
  } catch (error) {
    console.error("[/api/ai/iot-latest] Error:", error);
    return NextResponse.json({ session: null, detections: [] });
  }
}
