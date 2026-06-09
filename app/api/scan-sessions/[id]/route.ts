import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "scan_images";

function extractStoragePath(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    const marker = `/public/${STORAGE_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx !== -1) return decodeURIComponent(url.pathname.slice(idx + marker.length));
    return null;
  } catch {
    return null;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Session ID tidak ditemukan" }, { status: 400 });
  }

  // ── 1. Cek apakah session ada ─────────────────────────────────────────────
  const { data: session, error: selectErr } = await supabase
    .from("scan_sessions")
    .select("id, image_url")
    .eq("id", id)
    .maybeSingle();

  if (selectErr) {
    console.error("[select]", selectErr);
    return NextResponse.json(
      { error: selectErr.message, code: selectErr.code, hint: selectErr.hint },
      { status: 500 }
    );
  }

  if (!session) {
    return NextResponse.json({ error: "Session tidak ditemukan", id }, { status: 404 });
  }

  // ── 2. Hapus pantry_items yang referensi session ini ─────────────────────
  const { error: pantryErr } = await supabase
    .from("pantry_items")
    .delete()
    .eq("scan_session_id", id);

  if (pantryErr) {
    console.warn("[pantry_items delete]", pantryErr.message);
  }

  // ── 3. Hapus scan_detections ──────────────────────────────────────────────
  const { error: detErr } = await supabase
    .from("scan_detections")
    .delete()
    .eq("scan_session_id", id);

  if (detErr) {
    console.warn("[scan_detections delete]", detErr.message);
  }

  // ── 4. Hapus scan_sessions ────────────────────────────────────────────────
  const { error: dbErr } = await supabase
    .from("scan_sessions")
    .delete()
    .eq("id", id);

  if (dbErr) {
    console.error("[scan_sessions delete]", dbErr);
    return NextResponse.json(
      { error: dbErr.message, code: dbErr.code, hint: dbErr.hint },
      { status: 500 }
    );
  }

  // ── 5. Hapus storage (fire-and-forget) ────────────────────────────────────
  const paths: string[] = [`scan_${id}.jpg`, `annotated_${id}.jpg`];
  if (session.image_url) {
    const p = extractStoragePath(session.image_url);
    if (p && !paths.includes(p)) paths.push(p);
  }
  supabase.storage.from(STORAGE_BUCKET).remove(paths).then(({ error }) => {
    if (error) console.warn("[storage delete]", error.message);
  });

  return NextResponse.json({ success: true });
}
