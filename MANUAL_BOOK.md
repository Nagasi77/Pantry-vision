# 📖 Manual Book — PantryVision

**Versi:** 1.0  
**Aplikasi:** PantryVision — Sistem Pemantauan Kesegaran Bahan Makanan Berbasis AI & IoT  
**URL Produksi:** https://pantry-vision-eight.vercel.app

---

## Daftar Isi

1. [Pengenalan](#1-pengenalan)
2. [Cara Masuk (Login)](#2-cara-masuk-login)
3. [Dashboard](#3-dashboard)
4. [Scan Manual](#4-scan-manual)
5. [Sensor IoT (Live)](#5-sensor-iot-live)
6. [Inventori Pantry](#6-inventori-pantry)
7. [Rekomendasi Resep](#7-rekomendasi-resep)
8. [Nutridex](#8-nutridex)
9. [Riwayat Scan](#9-riwayat-scan)
10. [Hadoop Data Summary](#10-hadoop-data-summary)
11. [Profil Pengguna](#11-profil-pengguna)
12. [Petunjuk Instalasi](#12-petunjuk-instalasi)
13. [Cara Penggunaan](#13-cara-penggunaan)
14. [Troubleshooting](#14-troubleshooting)
15. [Pertanyaan Umum (FAQ)](#15-pertanyaan-umum-faq)
16. [Panduan Screenshot](#16-panduan-screenshot)

---

## 1. Pengenalan

**PantryVision** adalah aplikasi web cerdas yang membantu memantau kesegaran bahan makanan di dapur secara real-time. Aplikasi ini menggabungkan kecerdasan buatan (AI), sensor IoT, dan penyimpanan cloud untuk memberikan informasi akurat tentang kondisi stok bahan makananmu.

### Teknologi yang Digunakan

| Komponen | Teknologi |
|----------|-----------|
| Frontend | Next.js 15 + React + Tailwind CSS |
| Backend AI | Python + FastAPI + YOLOv8 |
| Database | Supabase (PostgreSQL) |
| Storage | Supabase Storage |
| Auth | NextAuth.js (Google, GitHub, Credentials) |
| IoT Protokol | MQTT (HiveMQ broker) |
| Perangkat IoT | ESP32-CAM + sensor MQ-2 + sensor ultrasonik |
| Big Data | Hadoop HDFS |
| Deployment | Vercel (frontend) + Azure (backend AI) |

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| Scan Manual | Upload foto bahan makanan, AI langsung mendeteksi kesegaran |
| Sensor IoT | Pantau kondisi pantry real-time via perangkat keras ESP32-CAM |
| Inventori | Lihat ringkasan stok bahan berdasarkan scan terakhir |
| Resep | Rekomendasi resep otomatis berdasarkan bahan segar yang tersedia |
| Nutridex | Database nutrisi buah dan sayuran |
| Riwayat | Semua riwayat scan tersimpan dan bisa difilter/dihapus |
| Hadoop | Analitik data deteksi dari HDFS |

---

## 2. Cara Masuk (Login)

![Halaman Login](docs/images/login.png)

Halaman login adalah pintu masuk utama ke aplikasi PantryVision. Tersedia tiga metode autentikasi.

### 2.1 Login dengan Email & Password

1. Buka aplikasi di browser
2. Masukkan **Email** dan **Password** yang sudah terdaftar
3. Klik tombol **"Login"**

### 2.2 Login dengan Google

1. Klik tombol **"Sign in with Google"**
2. Pilih akun Google kamu di popup
3. Kamu langsung masuk ke dashboard

### 2.3 Login dengan GitHub

1. Klik tombol **"Sign in with GitHub"**
2. Otorisasi aplikasi di halaman GitHub
3. Kamu langsung masuk ke dashboard

### 2.4 Registrasi Akun Baru

![Halaman Registrasi](docs/images/register.png)

1. Klik **"Daftar"** atau **"Register"** di halaman login
2. Isi form:
   - **Username** — nama yang akan ditampilkan
   - **Email** — alamat email aktif
   - **Password** — minimal 6 karakter
3. Klik **"Daftar"**

---

## 3. Dashboard

![Dashboard Overview](docs/images/dashboard-overview.png)

Dashboard adalah halaman utama yang menampilkan ringkasan kondisi pantry secara menyeluruh.

### 3.1 Kartu Statistik

![Kartu Statistik Dashboard](docs/images/dashboard-stats.png)

Di bagian atas terdapat 4 kartu statistik:

| Kartu | Keterangan |
|-------|-----------|
| **Total Bahan** | Jumlah total item yang terdeteksi pada scan terakhir |
| **Stok Segar** | Jumlah item berstatus "Segar" dari total item |
| **Busuk** | Jumlah item berstatus "Busuk" beserta nama itemnya |
| **Total Scan** | Total histori data yang masuk dari alat sensor |

### 3.2 Grafik Tren Deteksi

![Grafik Tren](docs/images/dashboard-chart.png)

Grafik area di bawah kartu statistik menampilkan jumlah item terdeteksi per sesi scan dari waktu ke waktu. Berguna untuk melihat pola penggunaan dan aktivitas pantry.

### 3.3 Inventori Dapur (Ringkasan)

Menampilkan 5 item teratas dari scan terakhir. Klik **"Lihat Semua"** untuk ke halaman Inventori lengkap.

### 3.4 Live Monitoring

Panel di sebelah kanan menampilkan data sensor real-time:
- **Gas** — status aroma/gas (Normal / tidak normal)
- **Jarak** — jarak objek dari sensor dalam cm

---

## 4. Scan Manual

Halaman ini memungkinkan analisis foto bahan makanan secara manual tanpa perangkat IoT.

### 4.1 Area Upload

![Area Upload Scan](docs/images/scan-upload.png)

Upload foto dengan salah satu cara:
- **Drag & drop** — seret foto ke area bertanda "Tarik gambar ke sini"
- **Klik area upload** — pilih file dari file browser

Format yang didukung: JPEG, PNG, WebP, dan format gambar umum lainnya.

### 4.2 Memulai Analisis

1. Pastikan foto sudah tampil di area preview
2. Klik tombol **"Mulai Analisis"**
3. Tunggu proses deteksi AI (2–5 detik tergantung koneksi)

### 4.3 Membaca Hasil Deteksi

![Hasil Scan](docs/images/scan-result.png)

Setelah analisis selesai:

**Banner Status (bagian atas hasil)**
- 🟢 *"Semua bahan dalam kondisi segar"* — tidak ada item busuk
- 🔴 *"Terdeteksi bahan busuk! Segera pisahkan dari stok segar"* — ada item busuk

**Gambar Anotasi YOLO (kiri)**
Gambar dengan bounding box berwarna:
- 🟩 **Kotak hijau** = item Segar
- 🟦 **Kotak biru** = item Busuk

Klik **"Perbesar"** / **"Kecilkan"** untuk menyesuaikan tampilan gambar.

**Daftar Objek Terdeteksi (kanan)**

| Informasi | Keterangan |
|-----------|-----------|
| Nomor urut | Urutan deteksi |
| Ikon & nama | Jenis bahan makanan |
| Badge status | Segar (hijau) / Busuk (merah) |
| Confidence % | Tingkat keyakinan model AI |

**Arti warna Confidence:**
- ≥ 75% — 🟢 Hijau (akurat)
- 50–74% — 🟡 Kuning (cukup yakin)
- < 50% — 🔴 Merah (kurang yakin, pertimbangkan foto ulang)

> **Catatan:** Hasil scan otomatis tersimpan ke Inventori dan Riwayat Scan.

### 4.4 Reset

Klik tombol **"Reset"** untuk menghapus foto dan hasil, lalu upload foto baru.

---

## 5. Sensor IoT (Live)

Halaman pemantauan real-time dari perangkat keras IoT (ESP32-CAM + sensor MQ-2 + ultrasonik).

### 5.1 Kartu Sensor Real-time

![Kartu Sensor](docs/images/sensor-cards.png)

| Kartu | Keterangan |
|-------|-----------|
| **Gas / Aroma** | Status gas dari sensor MQ-2. "Normal" = aman, nilai lain = ada indikasi pembusukan |
| **Jarak Scan** | Jarak objek dari kamera dalam cm. Optimal: **5–10 cm** untuk hasil terbaik |

Data diperbarui otomatis via protokol **MQTT** (broker HiveMQ).

### 5.2 Live Vision Panel

![Panel Live Vision](docs/images/sensor-live.png)

Dua gambar ditampilkan berdampingan:

| Panel | Keterangan |
|-------|-----------|
| **Gambar Asli** | Foto langsung dari kamera ESP32-CAM, dilengkapi timestamp |
| **Hasil Anotasi YOLO** | Gambar yang sudah diberi bounding box oleh AI |

Badge status di sudut gambar anotasi:
- 🟢 *"Semua Segar"*
- 🔴 *"Ada Busuk"*

### 5.3 Detail Objek Terdeteksi

Di bawah gambar, setiap objek ditampilkan dalam kartu berisi:
- Ikon dan nama bahan
- Badge status kesegaran
- Persentase confidence

### 5.4 Kontrol Hardware IoT

![Kontrol Hardware](docs/images/sensor-control.png)

Panel hitam di bagian bawah berisi 3 tombol kontrol:

| Tombol | Fungsi |
|--------|--------|
| **Sync Data** | Ambil data scan terbaru dari database tanpa trigger ESP32 |
| **Pause / Dijeda** | Bekukan tampilan agar gambar tidak berubah saat membaca hasil |
| **Jepret Kamera Alat** | Kirim perintah MQTT ke ESP32-CAM untuk foto baru, lalu auto-sync setelah 3,5 detik |

> **Tips:** Gunakan **"Jepret Kamera Alat"** untuk memperbarui scan pantry dari jarak jauh melalui aplikasi.

---

## 6. Inventori Pantry

Ringkasan stok bahan makanan berdasarkan scan terakhir yang dilakukan.

### 6.1 Panel Foto Scan Terakhir

![Inventori - Foto Scan](docs/images/inventori-foto.png)

Panel gelap di bagian atas menampilkan:
- Foto asli dari scan terakhir (klik untuk perbesar/perkecil)
- Waktu dan tanggal scan
- Badge sumber perangkat (IoT / Manual-Scan)
- Data sensor: status gas dan jarak (jika tersedia)

### 6.2 Kartu Ringkasan

| Kartu | Keterangan |
|-------|-----------|
| **Total Item** | Jumlah total objek yang terdeteksi |
| **Jenis Item** | Berapa jenis bahan berbeda |
| **Segar** | Jumlah item berstatus segar |
| **Busuk / Perlu Dibuang** | Jumlah item yang perlu segera ditangani |

### 6.3 Kartu Item Inventori

![Kartu Item Inventori](docs/images/inventori-cards.png)

Setiap bahan ditampilkan dalam kartu berisi:
- Ikon dan nama bahan
- Jumlah yang terdeteksi
- Badge status (Segar / Busuk)
- Bar kepercayaan model AI dengan warna:
  - 🟢 Hijau = Segar
  - 🔴 Merah = Busuk

### 6.4 Refresh Data

Klik tombol **"Refresh"** di pojok kanan atas untuk memuat ulang dari database.

---

## 7. Rekomendasi Resep

Sistem otomatis merekomendasikan resep masakan berdasarkan bahan segar di inventori.

### 7.1 Cara Kerja

1. Sistem membaca scan terakhir dari inventori
2. Mengambil item yang berstatus **"Segar"**
3. Mencari resep yang cocok dengan bahan-bahan tersebut
4. Menampilkan kartu resep diurutkan berdasarkan kecocokan

### 7.2 Daftar Resep

![Daftar Resep](docs/images/resep-list.png)

Bahan segar yang terdeteksi ditampilkan sebagai badge hijau di atas daftar resep.

Setiap kartu resep menampilkan:
- Foto hidangan
- Nama resep
- Kalori (jika tersedia)
- Daftar bahan utama
- Tombol **"Lihat Resep"**

### 7.3 Detail Resep

![Modal Detail Resep](docs/images/resep-modal.png)

Klik **"Lihat Resep"** untuk membuka modal detail berisi:
- Foto dan deskripsi
- Daftar lengkap bahan dan takaran
- Langkah-langkah memasak
- Informasi nutrisi

### 7.4 Tidak Ada Resep?

Jika tidak ada resep muncul, pastikan sudah melakukan scan bahan makanan. Pesan yang muncul:
> *"Belum ada bahan segar terdeteksi. Silakan lakukan pemindaian terlebih dahulu!"*

---

## 8. Nutridex

Database nutrisi interaktif untuk buah-buahan dan sayuran.

### 8.1 Pencarian dan Filter

![Nutridex Grid](docs/images/nutridex-grid.png)

- **Kotak pencarian** — ketik nama bahan (Indonesia atau Inggris), hasil difilter real-time
- **Tab filter:**
  - **All** — tampilkan semua
  - **Fruit** — hanya buah-buahan
  - **Veggie** — hanya sayuran

### 8.2 Kartu Item Nutridex

Setiap kartu menampilkan:
- Ikon, nama lokal, dan nama internasional
- Badge kategori (Fruit / Veggie)
- 2 manfaat kesehatan utama
- Kalori per sajian
- Tombol **"Lihat Nutrisi"**

### 8.3 Modal Detail Nutrisi

![Modal Detail Nutrisi](docs/images/nutridex-modal.png)

Klik **"Lihat Nutrisi"** untuk membuka detail lengkap:

**Deskripsi**
Penjelasan singkat tentang bahan tersebut.

**Kandungan Nutrisi** (per sajian/100g)
Grafik bar untuk:
- Kalori, Protein, Karbohidrat, Serat, Lemak

Badge tambahan:
- Gula, Kalsium, Zat Besi, Vitamin C, Kalium

**Kelebihan Utama**
Daftar manfaat kesehatan lengkap.

---

## 9. Riwayat Scan

Semua sesi scan tersimpan di sini, lengkap dengan foto, deteksi, dan waktu.

### 9.1 Kartu Statistik

Di bagian atas:
- **Total Sesi Scan** — total semua sesi tersimpan
- **Total Objek Terdeteksi** — jumlah item dari semua sesi
- **Sesi Ada Busuk** — berapa sesi yang memiliki item busuk

### 9.2 Panel Filter & Sorting

![Filter Riwayat](docs/images/riwayat-filter.png)

| Filter | Pilihan |
|--------|---------|
| **Pencarian** | Tanggal, nama bahan, sumber perangkat, atau ID sesi |
| **Status** | Semua / Hanya Segar / Hanya Busuk / Segar & Busuk / Tanpa Objek |
| **Sumber** | Semua sumber / filter per perangkat tertentu |
| **Sorting** | Terbaru / Terlama / Item Terbanyak / Item Paling Sedikit / Sumber A-Z |

Klik **"Reset Filter"** untuk mengembalikan semua filter ke default.

Atur jumlah tampilan per halaman di dropdown kanan bawah: **5 / 10 / 15 / 20 / 25 / 30** sesi.

### 9.3 Tabel Riwayat

![Tabel Riwayat](docs/images/riwayat-table.png)

Setiap baris tabel menampilkan:

| Kolom | Keterangan |
|-------|-----------|
| **Foto** | Thumbnail foto scan — klik untuk perbesar |
| **Waktu Scan** | Tanggal, jam, dan jumlah objek terdeteksi |
| **Bahan Terdeteksi** | Badge nama bahan (maks. 4 tampil, sisanya "+N lagi") |
| **Status** | Ada Segar ✓ / Ada Busuk ⚠ |
| **Sumber** | Nama perangkat yang melakukan scan |
| **Detail** ▾ | Expand/collapse detail per objek |
| **Aksi** | Tombol hapus sesi |

### 9.4 Detail Per Sesi

Klik tombol **▾** untuk melihat detail semua objek dalam sesi tersebut, meliputi nama, label raw, status kesegaran, dan confidence.

### 9.5 Melihat Foto Besar

Klik thumbnail foto untuk membuka modal dengan foto ukuran penuh dan semua detail deteksi.

### 9.6 Menghapus Sesi

**Hapus satu sesi:**
1. Klik tombol **"Hapus"** pada baris yang diinginkan
2. Konfirmasi di dialog yang muncul
3. Klik **"Hapus"** untuk konfirmasi — data terhapus permanen

**Hapus periodik (massal):**

![Modal Hapus Periodik](docs/images/riwayat-delete.png)

1. Klik **"Hapus Periodik"** di header halaman
2. Pilih periode:
   - Lebih dari **7 / 30 / 90 hari**
   - Lebih dari **12 / 24 / 48 jam**
   - **Custom jam** — masukkan jumlah jam sendiri
   - **Rentang tanggal** — pilih tanggal mulai dan akhir
   - **Semua riwayat** — hapus seluruh data
3. Klik **"Hapus Sekarang"** dan konfirmasi

> ⚠️ **Perhatian:** Penghapusan bersifat permanen. Foto di storage, data deteksi, dan item inventori terkait akan ikut terhapus.

### 9.7 Sync / Refresh

Klik **"Sync / Refresh Data"** untuk memuat ulang semua riwayat dari database.

---

## 10. Hadoop Data Summary

Analitik data deteksi yang telah disinkronisasi dari Supabase ke Hadoop HDFS.

![Hadoop Summary](docs/images/hadoop-stats.png)

### 10.1 Kartu Statistik

| Kartu | Keterangan |
|-------|-----------|
| **Total Detections** | Jumlah total item terdeteksi dari semua file HDFS |
| **Unique Labels** | Berapa jenis label unik yang ada |
| **Avg Confidence** | Rata-rata confidence semua deteksi |
| **Files Synced** | Jumlah file JSON yang tersinkronisasi |

### 10.2 Top Labels

Bar chart horizontal menampilkan 5 label/item yang paling sering muncul dalam data HDFS.

### 10.3 Recent Detections

10 deteksi terbaru berdasarkan timestamp — menampilkan label, waktu, dan confidence.

### 10.4 14-Day Detection Trends

Grafik batang 14 hari terakhir yang menampilkan:
- Jumlah deteksi per hari
- Rata-rata confidence per hari (%)

### 10.5 All Synced Files

Daftar semua file JSON di folder `hdfs_sync/`. Klik nama file untuk expand dan lihat semua item di dalamnya.

### 10.6 Sinkronisasi Data

Klik tombol **"Sync to Hadoop"** di header untuk memulai proses sinkronisasi data terbaru dari Supabase ke HDFS.

---

## 11. Profil Pengguna

Halaman untuk melihat dan mengedit informasi akun.

### 11.1 Tampilan Profil (View Mode)

![Profil - View](docs/images/profile-view.png)

**Kartu kiri (Avatar):**
- Foto profil (dari Google/GitHub jika login via OAuth)
- Nama lengkap dan email
- Badge **"OAuth Account"** untuk login via Google/GitHub

**Panel kanan (Detail Profil):**
- Nama lengkap
- Alamat email
- Tombol **"Edit Profil"**

### 11.2 Mode Edit Profil

![Profil - Edit](docs/images/profile-edit.png)

1. Klik tombol **"Edit Profil"**
2. Field yang dapat diedit:
   - **Nama Lengkap** — ketik nama baru
   - **Password Baru** — isi jika ingin mengganti (biarkan kosong jika tidak)
   - **Konfirmasi Password** — muncul otomatis saat field password diisi
3. Klik **"Simpan Perubahan"** — muncul spinner saat proses berlangsung
4. Notifikasi sukses muncul jika berhasil

**Untuk membatalkan:** Klik **"Batalkan"** untuk kembali tanpa menyimpan.

### 11.3 Catatan Penting

> - **Email tidak bisa diubah**
> - Akun **OAuth (Google/GitHub)** — tidak bisa mengubah password melalui aplikasi, akan muncul info berwarna biru
> - Password minimal **6 karakter**
> - Nama tidak boleh kosong

---

## 12. Petunjuk Instalasi

Bagian ini menjelaskan cara menjalankan PantryVision secara lokal untuk keperluan pengembangan atau pengujian.

### 12.1 Prasyarat

Pastikan perangkat sudah terinstal:

| Software | Versi Minimum | Keterangan |
|----------|--------------|------------|
| Node.js | 18.x atau lebih baru | Runtime untuk Next.js frontend |
| npm / yarn / pnpm | Terbaru | Package manager |
| Python | 3.10 atau lebih baru | Untuk backend AI (FastAPI) |
| pip | Terbaru | Package manager Python |
| Git | Terbaru | Untuk clone repository |

### 12.2 Clone Repository

```bash
git clone https://github.com/<username>/Pantry-vision.git
cd Pantry-vision
```

### 12.3 Konfigurasi Environment Variables

Salin file contoh dan isi nilainya:

```bash
cp .env.example .env.local
```

Buka `.env.local` dan isi semua variabel berikut:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_STORAGE_BUCKET=scan_images

# NextAuth
NEXTAUTH_SECRET=random_string_panjang
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (opsional)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx

# GitHub OAuth (opsional)
GITHUB_ID=xxx
GITHUB_SECRET=xxx

# URL Backend AI
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 12.4 Instalasi Frontend (Next.js)

```bash
# Install dependencies
npm install

# Jalankan development server
npm run dev
```

Frontend akan berjalan di **http://localhost:3000**

Perintah lain yang tersedia:

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Jalankan server development |
| `npm run build` | Build untuk production |
| `npm run start` | Jalankan server production (setelah build) |

### 12.5 Instalasi Backend AI (Python/FastAPI)

Buka terminal baru, masuk ke folder backend:

```bash
# Buat virtual environment (disarankan)
python -m venv venv

# Aktifkan virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Jalankan backend AI
uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend AI akan berjalan di **http://localhost:8000**

### 12.6 Konfigurasi Supabase

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buat tabel-tabel berikut di **Table Editor** atau **SQL Editor**:
   - `profiles` — data profil pengguna
   - `scan_sessions` — sesi scan
   - `scan_detections` — hasil deteksi per item
   - `pantry_items` — inventori bahan aktif
   - `sensor_data` — histori data sensor IoT
   - `foods`, `food_nutrients`, `food_benefits` — data Nutridex
3. Buat **Storage bucket** bernama `scan_images` (public)
4. Salin **URL**, **Anon Key**, dan **Service Role Key** ke `.env.local`

### 12.7 Konfigurasi IoT (Opsional)

Jika menggunakan perangkat ESP32-CAM:

1. Flash firmware ke ESP32-CAM dengan konfigurasi WiFi dan MQTT broker (HiveMQ)
2. Pastikan ESP32 subscribe ke topic `pantry/perintah` dan publish ke `pantry/sensors`
3. Backend Python harus berjalan dan dapat diakses dari jaringan yang sama

---

## 13. Cara Penggunaan

Panduan langkah demi langkah penggunaan PantryVision dari awal hingga fitur lengkap.

### 13.1 Alur Penggunaan Dasar

```
Daftar / Login → Dashboard → Scan Bahan → Cek Inventori → Lihat Resep
```

### 13.2 Penggunaan Pertama Kali

1. **Buka aplikasi** di browser: https://pantry-vision-eight.vercel.app
2. **Daftar akun** — klik "Register", isi email, username, dan password
3. **Login** dengan akun yang baru dibuat
4. Kamu akan langsung diarahkan ke **Dashboard**

### 13.3 Melakukan Scan Pertama

**Via Upload Manual:**
1. Klik menu **"Scan"** di sidebar kiri
2. Drag & drop foto bahan makanan ke area upload, atau klik untuk pilih file
3. Klik **"Mulai Analisis"**
4. Lihat hasil deteksi — nama bahan, status segar/busuk, dan confidence

**Via Sensor IoT:**
1. Pastikan perangkat ESP32-CAM menyala
2. Klik menu **"Sensor"** di sidebar
3. Klik tombol **"Jepret Kamera Alat"** — sistem akan mengirim perintah ke alat
4. Tunggu 3–5 detik, hasil scan muncul otomatis

### 13.4 Memantau Inventori

Setelah scan, buka menu **"Inventori"** untuk melihat:
- Foto scan terakhir
- Semua bahan yang terdeteksi beserta status kesegarannya
- Klik tombol **"Refresh"** untuk memuat data terbaru

### 13.5 Mendapatkan Rekomendasi Resep

1. Pastikan sudah ada scan dengan bahan **segar** yang terdeteksi
2. Buka menu **"Resep"**
3. Sistem otomatis menampilkan resep berdasarkan bahan segar yang ada
4. Klik **"Lihat Resep"** untuk detail lengkap dan cara memasak

### 13.6 Mengelola Riwayat Scan

1. Buka menu **"Riwayat"**
2. Gunakan **filter** untuk mencari sesi tertentu berdasarkan tanggal, status, atau sumber
3. Klik ikon **▾** pada baris untuk melihat detail per objek
4. Untuk menghapus: klik tombol **"Hapus"** pada baris, konfirmasi di dialog
5. Untuk hapus massal: klik **"Hapus Periodik"**, pilih rentang waktu

### 13.7 Menggunakan Nutridex

1. Buka menu **"Nutridex"**
2. Ketik nama bahan di kotak pencarian
3. Filter berdasarkan kategori: All / Fruit / Veggie
4. Klik **"Lihat Nutrisi"** untuk detail kandungan gizi lengkap

### 13.8 Mengedit Profil

1. Klik menu **"Profil"** di sidebar (biasanya di bagian bawah)
2. Klik tombol **"Edit Profil"**
3. Ubah nama dan/atau password baru
4. Klik **"Simpan Perubahan"**

---

## 14. Troubleshooting

Panduan mengatasi masalah umum yang mungkin ditemui saat menggunakan PantryVision.

### 14.1 Masalah Login

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| "Invalid credentials" | Email atau password salah | Periksa kembali email dan password. Pastikan Caps Lock tidak aktif |
| Tidak bisa login Google | Pop-up diblokir browser | Izinkan pop-up untuk domain aplikasi di pengaturan browser |
| Redirect loop setelah login | `NEXTAUTH_URL` salah di env | Pastikan `NEXTAUTH_URL` sesuai dengan URL aplikasi yang diakses |
| Session terus expired | `NEXTAUTH_SECRET` kosong | Isi `NEXTAUTH_SECRET` di environment variables |

### 14.2 Masalah Scan Manual

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| "Koneksi ke server AI gagal" | Backend Python tidak berjalan | Pastikan server FastAPI berjalan di port 8000. Cek `NEXT_PUBLIC_API_URL` di env |
| Hasil deteksi kosong (0 objek) | Foto terlalu gelap/buram | Foto ulang dengan pencahayaan lebih terang, objek lebih dekat |
| Confidence sangat rendah (<30%) | Objek tidak dikenali model | Pastikan bahan adalah buah/sayuran yang didukung model |
| Upload gagal / timeout | File terlalu besar atau koneksi lambat | Kompres gambar terlebih dahulu, ukuran disarankan < 5MB |
| Gambar anotasi tidak muncul | Backend tidak mengembalikan annotated_b64 | Pastikan parameter `annotated=true` dikirim, cek log backend |

### 14.3 Masalah Sensor IoT

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Data sensor tidak muncul / "Menunggu alat..." | ESP32 tidak terhubung MQTT | Pastikan ESP32 menyala dan terhubung ke WiFi. Restart perangkat |
| Jarak selalu 0 cm | Sensor ultrasonik tidak terbaca | Periksa koneksi kabel sensor HC-SR04 ke ESP32 |
| Gas selalu "Menunggu alat..." | Belum ada data masuk dari MQTT | Tunggu beberapa detik atau klik "Sync Data" |
| "Jepret Kamera Alat" tidak merespons | Koneksi MQTT terputus | Refresh halaman. Cek broker HiveMQ dapat diakses |
| Foto tidak tersimpan | Storage Supabase belum dikonfigurasi | Periksa `SUPABASE_STORAGE_BUCKET` dan permission bucket di Supabase |

### 14.4 Masalah Inventori & Riwayat

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Inventori kosong setelah scan | Data belum tersimpan ke DB | Tunggu beberapa detik lalu klik "Refresh" |
| Gagal menghapus sesi | Foreign key constraint (pantry_items) | Update aplikasi ke versi terbaru — sudah diperbaiki di route handler |
| Data muncul lagi setelah dihapus | Error saat hapus (perhatikan toast merah) | Lihat pesan error di toast, biasanya masalah permission atau koneksi |
| Riwayat tidak termuat | Supabase anon key tidak valid | Periksa `NEXT_PUBLIC_SUPABASE_ANON_KEY` di environment variables |

### 14.5 Masalah Resep

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Tidak ada resep yang muncul | Tidak ada bahan segar terdeteksi | Lakukan scan terlebih dahulu dan pastikan ada bahan berstatus "Segar" |
| Gambar resep tidak muncul | URL gambar dari API eksternal tidak valid | Normal jika resep dari API tidak memiliki gambar — tidak mempengaruhi konten |
| Loading terus tanpa hasil | Gagal fetch `/api/ai/iot-latest` | Periksa koneksi ke Supabase, cek error di browser console (`F12`) |

### 14.6 Masalah Profil

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| "Gagal update nama" | RLS policy Supabase memblokir UPDATE | Gunakan service role key, bukan anon key, di route `/api/profile` |
| Password tidak bisa diubah | Akun OAuth (Google/GitHub) | Password hanya bisa diubah untuk akun email/password biasa |
| Perubahan nama tidak langsung terlihat di sidebar | Session belum diperbarui | Refresh halaman setelah simpan — session akan terupdate |

### 14.7 Masalah Hadoop

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Halaman Hadoop kosong | Folder `hdfs_sync/` belum ada atau kosong | Jalankan script sinkronisasi: `python sync_supabase_to_hadoop.py` |
| Sync gagal | HDFS tidak dapat diakses | Pastikan Hadoop namenode berjalan dan `HDFS_URL` di env sudah benar |
| Data tidak terupdate | Script sync belum dijalankan ulang | Klik tombol "Sync to Hadoop" di halaman Hadoop |

### 14.8 Cara Melihat Error Detail

Jika mengalami masalah yang tidak tercantum di atas:

1. **Buka Browser DevTools** — tekan `F12`
2. Buka tab **Console** — lihat pesan error berwarna merah
3. Buka tab **Network** — klik request yang gagal, lihat tab **Response** untuk detail error dari server
4. **Cek log server** — di terminal tempat Next.js atau backend Python berjalan

---

## 15. Pertanyaan Umum (FAQ)

**Q: Hasil scan tidak muncul setelah upload foto?**  
A: Pastikan koneksi internet stabil dan server AI (backend Python di Azure) sedang berjalan. Coba klik "Mulai Analisis" kembali.

**Q: Sensor IoT tidak menampilkan data real-time?**  
A: Pastikan ESP32-CAM menyala dan terhubung ke jaringan WiFi yang sama dengan broker MQTT (HiveMQ). Klik "Sync Data" untuk memuat manual dari database.

**Q: Item yang sudah dihapus muncul lagi setelah refresh?**  
A: Perhatikan pesan toast notifikasi — jika merah berarti ada error. Pesan errornya akan menjelaskan penyebab kegagalan.

**Q: Resep tidak muncul di halaman Resep?**  
A: Resep hanya muncul jika ada bahan **segar** dari scan terakhir. Lakukan scan terlebih dahulu, lalu buka halaman Resep.

**Q: Tidak bisa login dengan email/password?**  
A: Pastikan email dan password benar. Jika lupa password, gunakan fitur "Lupa Password" atau hubungi admin.

**Q: Foto scan tidak tersimpan (gambar tidak muncul)?**  
A: Konfigurasi Supabase Storage mungkin belum lengkap di server backend. Hubungi admin untuk memeriksa `SUPABASE_STORAGE_BUCKET`.

**Q: Confidence rendah (<50%) artinya apa?**  
A: Model AI kurang yakin. Coba foto ulang dengan:
- Pencahayaan lebih terang
- Objek lebih dekat dan jelas (5–10 cm untuk IoT)
- Background lebih polos/bersih

**Q: Bagaimana menambah data nutrisi baru ke Nutridex?**  
A: Data dikelola langsung di Supabase (tabel `foods`, `food_nutrients`, `food_benefits`). Hubungi admin.

---

## 16. Panduan Screenshot

Gunakan panduan ini untuk mengambil screenshot yang tepat untuk melengkapi manual book ini. Simpan semua file di folder **`docs/images/`**.

| Nama File | URL / Halaman | Yang Perlu Ditampilkan |
|-----------|--------------|------------------------|
| `login.png` | `/` atau `/auth/login` | Form login lengkap dengan tombol Google & GitHub |
| `register.png` | `/auth/register` | Form registrasi |
| `dashboard-overview.png` | `/dashboard` | Seluruh halaman dashboard (scroll penuh jika perlu) |
| `dashboard-stats.png` | `/dashboard` | Crop bagian 4 kartu statistik di atas |
| `dashboard-chart.png` | `/dashboard` | Crop bagian grafik tren deteksi |
| `scan-upload.png` | `/scan` | Halaman scan sebelum upload (area drag & drop terlihat) |
| `scan-result.png` | `/scan` | Setelah analisis — gambar annotasi + daftar objek |
| `sensor-cards.png` | `/sensor` | Dua kartu Gas dan Jarak di bagian atas |
| `sensor-live.png` | `/sensor` | Panel Live Vision dengan kedua gambar |
| `sensor-control.png` | `/sensor` | Panel Kontrol Hardware IoT (panel hitam bawah) |
| `inventori-foto.png` | `/inventori` | Panel foto scan terakhir (panel gelap) |
| `inventori-cards.png` | `/inventori` | Grid kartu item inventori |
| `resep-list.png` | `/resep` | Daftar kartu resep dengan badge bahan segar |
| `resep-modal.png` | `/resep` | Modal detail resep terbuka |
| `nutridex-grid.png` | `/nutridex` | Grid kartu nutridex dengan filter terlihat |
| `nutridex-modal.png` | `/nutridex` | Modal detail nutrisi terbuka |
| `riwayat-filter.png` | `/riwayat` | Panel filter & sorting |
| `riwayat-table.png` | `/riwayat` | Tabel riwayat dengan beberapa baris data |
| `riwayat-delete.png` | `/riwayat` | Modal hapus periodik terbuka |
| `hadoop-stats.png` | `/hadoop` | Seluruh halaman Hadoop summary |
| `profile-view.png` | `/profile` | Halaman profil mode view (tidak sedang edit) |
| `profile-edit.png` | `/profile` | Halaman profil mode edit (form aktif) |

### Tips Mengambil Screenshot

1. **Gunakan browser full-screen** (F11) untuk hasil lebih bersih
2. **Resolusi disarankan:** minimal 1280×720 px
3. **Pastikan ada data** — lakukan scan terlebih dahulu agar halaman tidak menampilkan empty state
4. **Format:** PNG lebih diutamakan untuk kualitas teks yang tajam
5. **Tool screenshot:**
   - Windows: `Win + Shift + S` (Snipping Tool)
   - Browser DevTools: `Ctrl+Shift+I` → menu ⋮ → "Capture screenshot"
   - Full page: di DevTools, Command Palette (`Ctrl+Shift+P`) → "Capture full size screenshot"

---

*Manual Book ini dibuat untuk PantryVision v1.0. Untuk pertanyaan lebih lanjut, hubungi tim pengembang.*
