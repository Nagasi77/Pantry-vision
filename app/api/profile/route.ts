import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// PATCH /api/profile
// Body: { fullname?: string, password?: string }
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Tidak terautentikasi" }, { status: 401 });
    }

    const userId = (session.user as any).id as string | undefined;
    const userEmail = session.user.email as string | undefined;

    if (!userId && !userEmail) {
      return NextResponse.json({ error: "User ID tidak ditemukan di session" }, { status: 401 });
    }

    const body = await req.json();
    const { fullname, password } = body as { fullname?: string; password?: string };

    // ── Update full_name di tabel profiles ────────────────────────────────
    if (fullname !== undefined) {
      const trimmed = fullname.trim();
      if (!trimmed) {
        return NextResponse.json({ error: "Nama tidak boleh kosong" }, { status: 400 });
      }

      // Cari profile berdasarkan id atau email
      const query = userId
        ? supabaseAdmin.from("profiles").update({ full_name: trimmed }).eq("id", userId)
        : supabaseAdmin.from("profiles").update({ full_name: trimmed }).eq("email", userEmail!);

      const { error: profileErr } = await query;

      if (profileErr) {
        console.error("[profile update]", profileErr);
        return NextResponse.json(
          { error: `Gagal update nama: ${profileErr.message}` },
          { status: 500 }
        );
      }
    }

    // ── Update password di Supabase Auth ──────────────────────────────────
    if (password !== undefined && password !== "") {
      if (password.length < 6) {
        return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
      }

      if (!userId) {
        return NextResponse.json(
          { error: "Tidak dapat mengubah password: user ID tidak ditemukan" },
          { status: 400 }
        );
      }

      const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
      });

      if (pwErr) {
        console.error("[password update]", pwErr);
        return NextResponse.json(
          { error: `Gagal update password: ${pwErr.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("PATCH /api/profile unhandled:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
