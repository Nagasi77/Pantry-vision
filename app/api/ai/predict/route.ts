import { NextRequest, NextResponse } from "next/server";

const AZURE_API_URL = process.env.AZURE_SERVER_URL || "http://localhost:8000";

/**
 * POST /api/ai/predict
 * Forward foto ke FastAPI /predict/scan (YOLO multi-object)
 * Body: FormData { file: File, source?: string, gas?: string, jarak?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { status: false, message: "File wajib dikirim" },
        { status: 400 }
      );
    }

    const azureFormData = new FormData();
    azureFormData.append("file", file);

    // Forward optional metadata
    const source = formData.get("source") as string | null;
    const gas = formData.get("gas") as string | null;
    const jarak = formData.get("jarak") as string | null;
    if (source) azureFormData.append("source", source);
    if (gas) azureFormData.append("gas", gas);
    if (jarak) azureFormData.append("jarak", jarak);

    // Gunakan scan-annotated jika diminta, fallback ke scan biasa
    const useAnnotated = formData.get("annotated") === "true";
    const endpoint = useAnnotated ? "/predict/scan-annotated" : "/predict/scan";

    const response = await fetch(`${AZURE_API_URL}${endpoint}`, {
      method: "POST",
      body: azureFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Azure server error: ${response.status} — ${errText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[/api/ai/predict] Error:", error);
    return NextResponse.json(
      { status: false, message: "Koneksi ke server AI gagal" },
      { status: 500 }
    );
  }
}
