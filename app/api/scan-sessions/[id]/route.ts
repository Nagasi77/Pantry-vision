import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Session ID tidak ditemukan" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("scan_sessions")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: "Sesi berhasil dihapus" });
  } catch (error: any) {
    console.error("DELETE /api/scan-sessions/[id] error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal menghapus sesi" },
      { status: 500 }
    );
  }
}