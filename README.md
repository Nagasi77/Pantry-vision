# Pantry-vision

Tekan tombol untuk mengaktifkan Pantry-Visionnya lalu taruh objek makanan di tempat yang telah ditentukan

## Sinkronisasi Supabase ke Hadoop

1. Salin `.env.example` menjadi `.env.local` dan isi nilai Supabase serta Hadoop Anda.
2. Pastikan `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `HDFS_URL`, `HDFS_USER`, dan `HDFS_BASE_DIR` sudah terisi.
3. Jalankan skrip lokal:
   ```bash
   python sync_supabase_to_hadoop.py
   ```
4. Untuk otomatisasi Windows, buat tugas Task Scheduler dengan perintah yang sama agar skrip berjalan secara berkala.
