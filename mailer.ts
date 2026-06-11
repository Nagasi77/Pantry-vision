import nodemailer from "nodemailer";

// Konfigurasi Brevo SMTP
export const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SpoilageAlertPayload {
  itemName: string;
  location: string;
  gasLevel: number;
  detectedAt: string;
  recipientEmail?: string; // opsional, fallback ke EMAIL_TO di env
}

export interface FreshnessAlertPayload {
  itemName: string;
  freshnessStatus: "Busuk" | string;
  confidence: number;
  scannedAt: string;
  recipientEmail?: string;
}

// ── Template Helper ───────────────────────────────────────────────────────────

function baseTemplate(content: string): string {
  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: auto; background: #f8fafc; padding: 24px; border-radius: 12px;">
      <div style="background: linear-gradient(135deg, #16a34a, #059669); padding: 24px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px;">
          🥗 Pantry<span style="color: #bbf7d0;">Vision</span>
        </h1>
        <p style="color: #d1fae5; margin: 4px 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">
          Smart Food Storage
        </p>
      </div>
      <div style="background: white; padding: 28px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
        ${content}
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
          Email ini dikirim otomatis oleh sistem PantryVision.<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pantry-vision-eight.vercel.app"}" style="color: #16a34a;">Buka Dashboard →</a>
        </p>
      </div>
    </div>
  `;
}

// ── Kirim Alert Busuk dari Sensor Gas ────────────────────────────────────────

export async function sendSpoilageAlertEmail(payload: SpoilageAlertPayload) {
  const { itemName, location, gasLevel, detectedAt, recipientEmail } = payload;
  const to = recipientEmail || process.env.EMAIL_TO || "";

  if (!to) throw new Error("EMAIL_TO tidak dikonfigurasi dan recipientEmail tidak diberikan");

  const content = `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
      <h2 style="color: #dc2626; margin: 0 0 4px; font-size: 18px;">⚠️ Peringatan: Bahan Busuk Terdeteksi!</h2>
      <p style="color: #6b7280; margin: 0; font-size: 13px;">Sensor gas mendeteksi kondisi tidak normal</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 10px 12px; font-weight: 700; color: #374151; width: 40%;">Bahan</td>
        <td style="padding: 10px 12px; color: #1f2937;">${itemName}</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 12px; font-weight: 700; color: #374151;">Lokasi</td>
        <td style="padding: 10px 12px; color: #1f2937;">${location}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-weight: 700; color: #374151;">Level Gas (MQ-2)</td>
        <td style="padding: 10px 12px; color: #dc2626; font-weight: 700;">${gasLevel} ppm</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 12px; font-weight: 700; color: #374151;">Waktu Deteksi</td>
        <td style="padding: 10px 12px; color: #1f2937;">${detectedAt}</td>
      </tr>
    </table>
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
      Segera periksa dan singkirkan bahan yang busuk untuk mencegah kontaminasi ke bahan lain di pantry Anda.
    </p>
    <div style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pantry-vision-eight.vercel.app"}/inventori"
         style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
        Cek Inventori Sekarang →
      </a>
    </div>
  `;

  await transporter.sendMail({
    from: `"PantryVision Alert" <${process.env.EMAIL_FROM}>`,
    to,
    subject: `⚠️ [PantryVision] ${itemName} Terdeteksi Busuk! Gas: ${gasLevel} ppm`,
    html: baseTemplate(content),
  });
}

// ── Kirim Alert dari Hasil Scan AI ───────────────────────────────────────────

export async function sendFreshnessAlertEmail(payload: FreshnessAlertPayload) {
  const { itemName, freshnessStatus, confidence, scannedAt, recipientEmail } = payload;
  const to = recipientEmail || process.env.EMAIL_TO || "";

  if (!to) throw new Error("EMAIL_TO tidak dikonfigurasi dan recipientEmail tidak diberikan");

  const isBusuk = freshnessStatus === "Busuk";
  const statusColor = isBusuk ? "#dc2626" : "#16a34a";
  const statusBg = isBusuk ? "#fef2f2" : "#f0fdf4";
  const statusBorder = isBusuk ? "#fecaca" : "#bbf7d0";

  const content = `
    <div style="background: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
      <h2 style="color: ${statusColor}; margin: 0 0 4px; font-size: 18px;">
        ${isBusuk ? "🔴 Bahan Busuk Terdeteksi" : "🟢 Hasil Scan Bahan"}
      </h2>
      <p style="color: #6b7280; margin: 0; font-size: 13px;">Hasil analisis AI Vision (YOLOv8)</p>
    </div>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr>
        <td style="padding: 10px 12px; font-weight: 700; color: #374151; width: 40%;">Nama Bahan</td>
        <td style="padding: 10px 12px; color: #1f2937;">${itemName}</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 12px; font-weight: 700; color: #374151;">Status Kesegaran</td>
        <td style="padding: 10px 12px; font-weight: 700; color: ${statusColor};">${freshnessStatus}</td>
      </tr>
      <tr>
        <td style="padding: 10px 12px; font-weight: 700; color: #374151;">Kepercayaan AI</td>
        <td style="padding: 10px 12px; color: #1f2937;">${confidence}%</td>
      </tr>
      <tr style="background: #f9fafb;">
        <td style="padding: 10px 12px; font-weight: 700; color: #374151;">Waktu Scan</td>
        <td style="padding: 10px 12px; color: #1f2937;">${scannedAt}</td>
      </tr>
    </table>
    ${isBusuk ? `
    <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
      Disarankan segera pisahkan <strong>${itemName}</strong> dari bahan lain untuk mencegah kontaminasi.
    </p>
    <div style="margin-top: 20px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://pantry-vision-eight.vercel.app"}/inventori"
         style="display: inline-block; background: #16a34a; color: white; padding: 12px 24px;
                border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px;">
        Lihat Inventori →
      </a>
    </div>
    ` : ""}
  `;

  await transporter.sendMail({
    from: `"PantryVision" <${process.env.EMAIL_FROM}>`,
    to,
    subject: isBusuk
      ? `🔴 [PantryVision] ${itemName} Terdeteksi Busuk (${confidence}% confidence)`
      : `✅ [PantryVision] Scan Selesai — ${itemName} ${freshnessStatus}`,
    html: baseTemplate(content),
  });
}

// ── Test koneksi SMTP ─────────────────────────────────────────────────────────

export async function verifySmtpConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (err) {
    console.error("[Brevo SMTP] Koneksi gagal:", err);
    return false;
  }
}
