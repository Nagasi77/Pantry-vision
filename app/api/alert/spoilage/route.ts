import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendSpoilageAlertEmail, sendFreshnessAlertEmail, verifySmtpConnection } from "../../../../mailer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Ambil semua email user dari tabel profiles
async function getAllUserEmails(): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .not("email", "is", null);

  if (error) {
    console.error("[getAllUserEmails] Error:", error.message);
    return [];
  }

  return (data || []).map((p) => p.email).filter(Boolean);
}

// POST /api/alert/spoilage
// Body: { type, itemName, location, gasLevel, detectedAt, freshnessStatus, confidence, scannedAt, recipientEmail? }
// Jika recipientEmail tidak diisi → kirim ke SEMUA user terdaftar
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      type = "gas",
      itemName,
      location,
      gasLevel,
      detectedAt,
      freshnessStatus,
      confidence,
      scannedAt,
      recipientEmail, // opsional — kalau diisi, hanya kirim ke ini
    } = body;

    if (!itemName) {
      return NextResponse.json({ error: "itemName wajib diisi" }, { status: 400 });
    }

    // Tentukan daftar penerima
    let recipients: string[] = [];
    if (recipientEmail) {
      // Kirim ke satu email spesifik (misal: user yang sedang login)
      recipients = [recipientEmail];
    } else {
      // Kirim ke semua user yang terdaftar di Supabase
      recipients = await getAllUserEmails();
      // Fallback ke EMAIL_TO jika tabel profiles kosong
      if (recipients.length === 0 && process.env.EMAIL_TO) {
        recipients = [process.env.EMAIL_TO];
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada penerima email. Pastikan tabel profiles memiliki data atau EMAIL_TO dikonfigurasi." },
        { status: 400 }
      );
    }

    // ── Type: gas (dari sensor MQ-2) ─────────────────────────────────────────
    if (type === "gas") {
      if (gasLevel === undefined || gasLevel === null) {
        return NextResponse.json({ error: "gasLevel wajib untuk type gas" }, { status: 400 });
      }

      if (Number(gasLevel) < 400) {
        return NextResponse.json(
          { message: "Gas level normal, alert tidak dikirim", gasLevel },
          { status: 200 }
        );
      }

      // Kirim ke semua penerima secara paralel
      const results = await Promise.allSettled(
        recipients.map((email) =>
          sendSpoilageAlertEmail({
            itemName,
            location: location || "Pantry",
            gasLevel: Number(gasLevel),
            detectedAt: detectedAt || new Date().toLocaleString("id-ID"),
            recipientEmail: email,
          })
        )
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return NextResponse.json({
        message: `Alert gas dikirim ke ${sent} dari ${recipients.length} penerima`,
        sent,
        failed,
        recipients: recipients.length,
      });
    }

    // ── Type: freshness (dari scan AI) ───────────────────────────────────────
    if (type === "freshness") {
      if (!freshnessStatus) {
        return NextResponse.json({ error: "freshnessStatus wajib untuk type freshness" }, { status: 400 });
      }

      if (freshnessStatus !== "Busuk") {
        return NextResponse.json(
          { message: "Bahan segar, alert tidak dikirim", freshnessStatus },
          { status: 200 }
        );
      }

      const results = await Promise.allSettled(
        recipients.map((email) =>
          sendFreshnessAlertEmail({
            itemName,
            freshnessStatus,
            confidence: confidence || 0,
            scannedAt: scannedAt || new Date().toLocaleString("id-ID"),
            recipientEmail: email,
          })
        )
      );

      const sent = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return NextResponse.json({
        message: `Alert kesegaran dikirim ke ${sent} dari ${recipients.length} penerima`,
        sent,
        failed,
        recipients: recipients.length,
      });
    }

    return NextResponse.json(
      { error: "type tidak dikenal. Gunakan: gas | freshness" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[/api/alert/spoilage] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Gagal mengirim alert" },
      { status: 500 }
    );
  }
}

// GET /api/alert/spoilage — test koneksi SMTP + info penerima
export async function GET() {
  try {
    const [smtpOk, emails] = await Promise.all([
      verifySmtpConnection(),
      getAllUserEmails(),
    ]);

    return NextResponse.json({
      smtp: smtpOk ? "connected" : "failed",
      host: process.env.BREVO_SMTP_HOST,
      user: process.env.BREVO_SMTP_USER ? "set" : "MISSING",
      emailFrom: process.env.EMAIL_FROM ? "set" : "MISSING",
      registeredUsers: emails.length,
      recipients: emails, // daftar email yang akan menerima alert
    });
  } catch (err: any) {
    return NextResponse.json({ smtp: "error", detail: err?.message }, { status: 500 });
  }
}
