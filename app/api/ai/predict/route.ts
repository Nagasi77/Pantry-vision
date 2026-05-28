import { NextRequest, NextResponse } from "next/server";

// Get Azure server URL from environment variables
const AZURE_API_URL = process.env.AZURE_SERVER_URL || "http://localhost:8000";

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

    // Forward the image to Azure server
    const azureFormData = new FormData();
    azureFormData.append("file", file);

    const response = await fetch(`${AZURE_API_URL}/predict/manual`, {
      method: "POST",
      body: azureFormData,
    });

    if (!response.ok) {
      throw new Error(`Azure server error: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in AI prediction:", error);
    return NextResponse.json(
      { status: false, message: "Koneksi ke server AI gagal" },
      { status: 500 }
    );
  }
}
