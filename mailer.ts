import  nodemailer  from 'nodemailer';

export const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST, 
    port: Number(process.env.BREVO_SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_PASS,
    },
});

export interface SpoilageAlertPayload {
    itemName: string;
    location: string;
    gasLevel: number;
    detectedAt: string;
}

export async function sendSpoilageAlertEmail(payload: SpoilageAlertPayload) {
    const { itemName, location, gasLevel, detectedAt } = payload;

    const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: auto;">
      <div style="background: #ff4d4f; padding: 20px; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0;">⚠️ Peringatan: Bahan Busuk Terdeteksi!</h1>
      </div>
      <div style="padding: 24px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
        <table style="width:100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px; font-weight: bold;">Bahan</td>
            <td style="padding: 8px;">${itemName}</td>
          </tr>
          <tr style="background:#fff5f5">
            <td style="padding: 8px; font-weight: bold;">Lokasi</td>
            <td style="padding: 8px;">${location}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Level Gas (MQ-135)</td>
            <td style="padding: 8px; color: red;">${gasLevel} ppm</td>
          </tr>
          <tr style="background:#fff5f5">
            <td style="padding: 8px; font-weight: bold;">Waktu Deteksi</td>
            <td style="padding: 8px;">${detectedAt}</td>
          </tr>
        </table>
        <p style="margin-top: 20px; color: #666;">
          Segera periksa dan singkirkan bahan yang busuk untuk mencegah kontaminasi.
        </p>
        <a href="http://localhost:3000/dashboard" 
           style="display:inline-block; background:#1677ff; color:white; 
                  padding:12px 24px; border-radius:6px; text-decoration:none;">
          Lihat Dashboard →
        </a>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"Pantry Vision" <${process.env.EMAIL_FROM}>`,
    to: process.env.EMAIL_TO,
    subject: `🚨 [Pantry Vision] ${itemName} Terdeteksi Busuk!`,
    html: htmlBody,
  });
}
