from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import time

app = FastAPI(title="Pantry AI Monitor Backend")

# Mengizinkan Vercel atau aplikasi apa pun untuk mengakses API ini
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Nanti bisa diganti dengan URL Vercel asli Anda demi keamanan
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulasi database sederhana di memori untuk menyimpan status pantry
pantry_database = {
    "camera_status": "Kamera Belum Mengirim Gambar",
    "total_items": 0,
    "last_updated": "Belum ada data"
}

@app.get("/")
def read_root():
    return {"message": "Server Azure Pantry AI Berjalan Lancar!"}

# 1. Endpoint untuk menerima tembakan data/foto dari ESP32-CAM
@app.post("/api/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Membaca file gambar mentah (bytes) dari ESP32-CAM
        image_bytes = await file.read()
        
        # Simulasi pembaruan data setelah mendapat foto baru
        pantry_database["camera_status"] = "AKTIF - Terhubung"
        pantry_database["total_items"] = 5  # Contoh hasil deteksi AI sementara
        pantry_database["last_updated"] = time.strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"[INFO] Foto diterima! Ukuran: {len(image_bytes)} bytes")
        return {"status": "FOTO_OK", "message": "Gambar berhasil diproses server"}
        
    except Exception as e:
        return {"status": "FOTO_GAGAL", "error": str(e)}

# 2. Endpoint untuk diambil (fetch) oleh Next.js di Vercel
@app.get("/api/data-pantry")
def get_pantry_data():
    return pantry_database