import { supabase } from "../../../lib/supabase"
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, username } = await request.json();

    // 1. Daftar ke Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Menyimpan username ke metadata agar bisa diambil nanti
        data: {
          full_name: username,
        },
      },
    });

    if (error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({ message: "Registrasi Berhasil" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}