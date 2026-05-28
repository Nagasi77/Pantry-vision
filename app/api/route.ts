import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    // Ambil data email dan password dari body request yang dikirim frontend
    const { email, password } = await req.json();

    // Validasi input sederhana
    if (!email || !password) {
      return NextResponse.json(
        { status: false, message: "Email dan password wajib diisi" },
        { status: 400 }
      );
    }

    // Proses signup ke Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    // Jika ada error dari Supabase (misal user sudah terdaftar atau password terlalu lemah)
    if (error) {
      return NextResponse.json(
        { status: false, message: error.message },
        { status: 400 }
      );
    }

    // Jika berhasil
    return NextResponse.json(
      { 
        status: true, 
        message: "Registrasi berhasil! Silakan cek email untuk verifikasi jika diaktifkan.",
        data: data.user 
      },
      { status: 200 }
    );

  } catch (error) {
    return NextResponse.json(
      { status: false, message: "Terjadi kesalahan pada server" },
      { status: 500 }
    );
  }
}