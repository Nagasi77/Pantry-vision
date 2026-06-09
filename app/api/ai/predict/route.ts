import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.NEXT_PUBLIC_API_URL || 
  "https://pantry-vision-app-2026-eqbvdnfwhwf8cqhc.indonesiacentral-01.azurewebsites.net";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const source = formData.get("source") as string | null;
    const gas = formData.get("gas") as string | null;
    const jarak = formData.get("jarak") as string | null;
    const useAnnotated = formData.get("annotated") === "true";

    if (!file) {
      return NextResponse.json({ status: false, message: "File wajib dikirim" }, { status: 400 });
    }

    const isFromLanding = source === "Landing-Scan";
    console.log(`[Next.js API] source=${source}, isFromLanding=${isFromLanding}`);

    const apiFormData = new FormData();
    apiFormData.append("file", file);
    if (source) apiFormData.append("source", source);
    if (gas) apiFormData.append("gas", gas);
    if (jarak) apiFormData.append("jarak", jarak);
    
    // Kirim skip_storage = "true" jika dari landing page, atau "false" jika tidak (opsional)
    apiFormData.append("skip_storage", isFromLanding ? "true" : "false");
    
    console.log(`[Next.js API] skip_storage = ${isFromLanding ? "true" : "false"}`);

    const endpoint = useAnnotated ? "/predict/scan-annotated" : "/predict/scan";
    const response = await fetch(`${FASTAPI_URL}${endpoint}`, {
      method: "POST",
      body: apiFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`FastAPI error: ${response.status} — ${errText}`);
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[/api/ai/predict] Error:", error);
    return NextResponse.json(
      { status: false, message: error.message || "Koneksi ke server AI gagal" },
      { status: 500 }
    );
  }
}