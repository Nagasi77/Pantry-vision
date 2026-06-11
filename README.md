# PantryVision

**PantryVision** adalah aplikasi web cerdas untuk memantau kesegaran bahan makanan di dapur dengan kombinasi AI, IoT, dan database terpusat. Proyek ini memungkinkan:

- deteksi otomatis segar vs busuk dari foto bahan makanan
- pemantauan sensor real-time menggunakan ESP32-CAM dan MQTT
- inventori pantry berbasis hasil scan terbaru
- rekomendasi resep otomatis dari bahan segar yang tersedia
- sinkronisasi data analitik ke Hadoop HDFS

## Product Description

PantryVision membantu pengguna menjaga kualitas bahan makanan di rumah atau dapur komersial. Dengan kamera ESP32-CAM, sensor gas MQ-135, dan model YOLO berbasis AI, aplikasi ini menyajikan informasi berikut:

- status bahan makanan secara real-time
- kualitas udara / aroma dalam pantry
- jarak optimal untuk scan kamera
- hasil anotasi objek makanan yang terdeteksi
- sejarah scan, inventori, dan rekomendasi resep
- sinkronisasi analitik ke Hadoop untuk kebutuhan Big Data

Aplikasi ini dirancang untuk penggunaan modern dengan frontend Next.js, otentikasi NextAuth, backend AI FastAPI, penyimpanan Supabase, dan integrasi MQTT.

## Fitur Utama

- Dashboard ringkasan pantry dan tren deteksi
- Scan manual file gambar melalui halaman scan
- Sensor IoT live untuk data gas dan jarak
- Upload hasil scan ke Supabase dan inventori otomatis
- Rekomendasi resep berdasarkan bahan segar
- Nutridex nutrisi buah dan sayuran
- Riwayat scan lengkap dengan filter dan penghapusan
- Sinkronisasi ke Hadoop HDFS melalui skrip ETL

## Teknologi

- Frontend: Next.js 16 + React 19 + Tailwind CSS
- Otentikasi: NextAuth.js (Google, GitHub, Credentials)
- Database / Storage: Supabase
- Backend AI: FastAPI + YOLOv8 + Python
- IoT: MQTT (HiveMQ broker) + ESP32-CAM
- Big Data: Hadoop HDFS
- Deployment: Vercel (frontend) + Azure / FastAPI (AI backend)

## Persiapan Lingkungan

1. Salin file konfigurasi:
   ```bash
   copy .env.example .env.local
   ```
2. Isi nilai environment di `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GITHUB_ID`
   - `GITHUB_SECRET`
   - `GMAIL_USER`
   - `GMAIL_APP_PASSWORD`
   - `AZURE_SERVER_URL`
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_APP_URL`

3. Pastikan Supabase dan provider OAuth sudah dikonfigurasi.
4. Pastikan backend AI atau Azure endpoint tersedia untuk endpoint `/api/ai/predict`.

## Menjalankan Frontend

Instal dependensi dan jalankan aplikasi Next.js:

```bash
npm install
npm run dev
```

Akses aplikasi di `http://localhost:3000`.

## Menjalankan Backend AI (opsional)

Backend AI berada di folder `deploy_ai/`.

1. Instal dependensi Python:
   ```bash
   python -m pip install -r deploy_ai/requirements.txt
   ```
2. Jalankan server FastAPI:
   ```bash
   cd deploy_ai
   python main.py
   ```

Backend ini memuat model YOLO, menghubungkan ke Supabase, dan mendukung upload gambar, prediksi objek, serta event MQTT.

## Sinkronisasi Hadoop

Untuk sinkronisasi data Supabase ke Hadoop HDFS, gunakan skrip:

```bash
python sync_supabase_to_hadoop.py
```

Skrip ini membaca konfigurasi dari `.env.local`, mengambil data baru dari tabel `scan_sessions`, dan menulis file JSON ke HDFS atau backup lokal jika penulisan HDFS gagal.

## Struktur Proyek

- `app/` - aplikasi Next.js dan API route
- `app/(dashboard)/` - halaman dashboard utama seperti sensor, scan, inventori, resep, riwayat, nutridex, hadoop
- `app/api/` - API endpoint Next.js untuk auth, AI, profil, scan sessions, dan sinkronisasi
- `components/` - komponen UI reusable
- `context/` - konteks React untuk auth
- `deploy_ai/` - backend AI FastAPI dan model YOLO
- `firmware/` - kode untuk ESP32-CAM / perangkat IoT
- `sync_supabase_to_hadoop.py` - skrip ETL Supabase → Hadoop
- `fetch_hadoop_to_local.py` - utilitas ambil data HDFS ke lokal
- `.env.example` - contoh konfigurasi lingkungan

## Halaman Utama

- `/` — landing page dan scan manual
- `/auth/login` — halaman autentikasi
- `/auth/register` — registrasi pengguna
- `/dashboard/sensor` — monitoring IoT dan foto scan terbaru
- `/dashboard/scan` — upload gambar dan analisis AI
- `/dashboard/inventori` — ringkasan bahan pantry
- `/dashboard/resep` — rekomendasi resep bahan segar
- `/dashboard/riwayat` — riwayat scan lengkap
- `/dashboard/nutridex` — informasi nutrisi bahan makanan
- `/dashboard/hadoop` — ringkasan data Hadoop
- `/admin` — area admin (jika ada hak akses)

## Konfigurasi MQTT dan IoT

- Frontend terhubung ke broker MQTT HiveMQ di `wss://broker.hivemq.com:8884/mqtt`.
- Perangkat ESP32-CAM mengirim data sensor ke topik `pantry/sensors`.
- Perintah pengambilan foto dikirim ke topik `pantry/perintah`.
- Backend AI juga dapat mempublikasikan status ke topik `pantry/kondisi`.

## Troubleshooting

- Jika halaman sensor tidak menampilkan data MQTT, pastikan ESP32-CAM dan broker HiveMQ online.
- Jika `fetch('/api/ai/predict')` gagal, periksa `NEXT_PUBLIC_API_URL` dan endpoint FastAPI.
- Jika Supabase tidak dapat diakses, pastikan variabel `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` benar.
- Jika sinkronisasi Hadoop gagal, cek nilai `HDFS_URL`, `HDFS_USER`, `HDFS_BASE_DIR`, dan koneksi HDFS.

## Catatan

- Aplikasi ini memanfaatkan Supabase untuk penyimpanan `scan_sessions`, `scan_detections`, `pantry_items`, dan `user profile`.
- Banyak endpoint server-side menggunakan `SUPABASE_SERVICE_ROLE_KEY` untuk menjalankan query yang memerlukan hak akses.
- `NEXT_PUBLIC_API_URL` digunakan oleh frontend ketika memanggil API FastAPI di belakang layar.

## Kontak & Pengembangan

Jika ingin menambahkan fitur baru, fokus pada peningkatan:

- akurasi deteksi kesegaran AI
- pengalaman pengguna saat perangkat IoT offline
- integrasi notifikasi busuk / gas berlebih
- penambahan tests dan CI

Selamat mengembangkan PantryVision!
