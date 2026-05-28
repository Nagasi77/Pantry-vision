import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const AZURE_API_URL = process.env.AZURE_SERVER_URL || "http://localhost:8000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req: NextRequest) {
  try {
    // Fetch latest detection from Supabase instead of Azure
    const { data, error } = await supabase
      .from("detections")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        {
          label: "Belum Ada Objek",
          confidence: 0,
          saran: "Tempatkan buah apel di dalam jangkauan sensor.",
          image_url: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      label: data?.display_label || "Belum Ada Objek",
      confidence: data?.confidence || 0,
      saran: data?.suggestion || "Tempatkan buah apel di dalam jangkauan sensor.",
      image_url: data?.image_path || null,
    });
  } catch (error) {
    console.error("Error fetching IoT data:", error);
    return NextResponse.json(
      { status: false, message: "Gagal mengambil data IoT" },
      { status: 500 }
    );
  }
}
