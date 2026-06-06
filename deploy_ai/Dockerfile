# Menggunakan image resmi Ultralytics versi CPU
FROM ultralytics/ultralytics:latest-cpu

# Menentukan folder kerja di dalam container
WORKDIR /app

# Copy file requirements terlebih dahulu
COPY requirements.txt .

# Install dependency Python
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh isi project
COPY . .

# Membuka port container
EXPOSE 8080

# Menjalankan FastAPI menggunakan port dari Railway
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]