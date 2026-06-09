import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AVATAR_BUCKET = "avatars";

// POST /api/profile/avatar
// Body: FormData dengan field "file" (image)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const userId = (session.user as any).id as string | undefined;
    const userEmail = session.user.email as string | undefined;

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "User ID tidak ditemukan" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validasi tipe file
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "File harus berupa gambar" }, { status: 400 });
    }

    // Validasi ukuran file (maks 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran file maksimal 2MB" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${userId || userEmail?.replace(/[@.]/g, "_")}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload ke Supabase Storage bucket "avatars"
    const { error: uploadError } = await supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true, // overwrite jika sudah ada
      });

    if (uploadError) {
      console.error("[avatar upload]", uploadError);
      return NextResponse.json(
        { error: `Gagal upload foto: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Ambil public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(AVATAR_BUCKET)
      .getPublicUrl(fileName);

    const avatarUrl = urlData.publicUrl;

    // Simpan avatar_url ke tabel profiles
    const query = userId
      ? supabaseAdmin.from("profiles").update({ avatar_url: avatarUrl }).eq("id", userId)
      : supabaseAdmin.from("profiles").update({ avatar_url: avatarUrl }).eq("email", userEmail!);

    const { error: dbError } = await query;

    if (dbError) {
      console.warn("[profiles avatar_url update]", dbError.message);
      // Tidak gagalkan — URL sudah diupload, kembalikan URL ke client
    }

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err: any) {
    console.error("POST /api/profile/avatar unhandled:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
