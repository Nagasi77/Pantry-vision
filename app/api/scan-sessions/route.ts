import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

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