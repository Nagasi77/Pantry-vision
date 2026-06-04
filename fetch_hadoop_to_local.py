#!/usr/bin/env python3
"""Unduh file JSON dari HDFS ke folder lokal `hdfs_sync/`.

Gunakan ketika Anda ingin menyalin hasil yang tersimpan di Hadoop ke direktori
lokal agar halaman Next.js dapat membacanya.

Konfigurasi lewat environment (.env.local) atau variabel lingkungan:
- HDFS_URL (default: http://localhost:9870)
- HDFS_USER (default: hdfs)
- HDFS_BASE_DIR (default: /user/pantry_vision)
- SUPABASE_SYNC_TABLE (default: detections)
"""

from __future__ import annotations

import logging
import os
import posixpath
from pathlib import Path

from dotenv import load_dotenv

try:
    from hdfs import InsecureClient
except ImportError as exc:
    raise SystemExit("Library `hdfs` belum diinstal. Jalankan: pip install hdfs") from exc

ROOT = Path(__file__).resolve().parent
load_dotenv(str(ROOT / '.env.local'))

HDFS_URL = os.getenv('HDFS_URL', 'http://localhost:9870')
HDFS_USER = os.getenv('HDFS_USER', 'hdfs')
HDFS_BASE_DIR = os.getenv('HDFS_BASE_DIR', '/user/pantry_vision')
SUPABASE_SYNC_TABLE = os.getenv('SUPABASE_SYNC_TABLE', 'detections')

LOCAL_DIR = ROOT / 'hdfs_sync'
LOCAL_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')


def list_remote_files(client: InsecureClient, remote_dir: str) -> list[str]:
    try:
        files = client.list(remote_dir)
        return [f for f in files if f.endswith('.json')]
    except Exception as exc:
        logging.error('Gagal list HDFS dir %s: %s', remote_dir, exc)
        return []


def download_file(client: InsecureClient, remote_path: str, local_path: Path) -> bool:
    try:
        client.download(remote_path, str(local_path), overwrite=False)
        logging.info('Diunduh: %s -> %s', remote_path, local_path)
        return True
    except Exception as exc:
        logging.error('Gagal mengunduh %s: %s', remote_path, exc)
        return False


def main() -> int:
    client = InsecureClient(HDFS_URL, user=HDFS_USER)
    remote_dir = posixpath.join(HDFS_BASE_DIR, SUPABASE_SYNC_TABLE)

    logging.info('Mencari file JSON di HDFS: %s', remote_dir)
    files = list_remote_files(client, remote_dir)
    if not files:
        logging.info('Tidak ada file JSON di %s', remote_dir)
        return 0

    downloaded = 0
    for fname in files:
        remote_path = posixpath.join(remote_dir, fname)
        local_path = LOCAL_DIR / fname
        if local_path.exists():
            logging.info('Lewat (sudah ada): %s', fname)
            continue
        if download_file(client, remote_path, local_path):
            downloaded += 1

    logging.info('Selesai. Diunduh %d file baru ke %s', downloaded, LOCAL_DIR)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
