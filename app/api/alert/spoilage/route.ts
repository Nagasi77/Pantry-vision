import { NextRequest, NextResponse } from "next/server";
import { sendSpoilageAlertEmail} from "../../../../mailer";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { itemName, location, gasLevel, detectedAt } = body;

    // Validasi threshold: kirim email hanya jika gas level > 400 ppm
    if (gasLevel < 400) {
      return NextResponse.json(
        { message: "Gas level normal, no alert sent" },
        { status: 200 }
      );
    }

    await sendSpoilageAlertEmail({
      itemName,
      location,
      gasLevel,
      detectedAt: detectedAt || new Date().toLocaleString("id-ID"),
    });

    return NextResponse.json(
      { message: "Alert email sent successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Email error:", error);
    return NextResponse.json(
      { error: "Failed to send alert" },
      { status: 500 }
    );
  }
}