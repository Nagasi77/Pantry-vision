#!/usr/bin/env python3
"""Sinkronisasi data Supabase ke Hadoop HDFS.

Jalankan skrip ini lokal sebagai bagian dari proses ETL. Jika ingin otomatis,
pakai Windows Task Scheduler untuk memanggil file ini secara berkala.
"""

from __future__ import annotations

import json
import logging
import os
import posixpath
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

try:
    from hdfs import InsecureClient
except ImportError as exc:
    raise SystemExit(
        "Library `hdfs` belum diinstal. Jalankan: pip install hdfs"
    ) from exc

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",


)

ROOT_DIR = Path(__file__).resolve().parent
STATE_FILE = ROOT_DIR / "sync_state.json"
LOCAL_FALLBACK_DIR = ROOT_DIR / "hdfs_sync"

env_path = os.getenv("ENV_PATH", str(ROOT_DIR / ".env.local"))
load_dotenv(env_path)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_SYNC_TABLE = os.getenv("SUPABASE_SYNC_TABLE", "detections")
SUPABASE_TIMESTAMP_FIELD = os.getenv("SUPABASE_TIMESTAMP_FIELD", "timestamp")
HDFS_URL = os.getenv("HDFS_URL", "http://localhost:9870")
HDFS_USER = os.getenv("HDFS_USER", "hdfs")
HDFS_BASE_DIR = os.getenv("HDFS_BASE_DIR", "/user/pantry_vision")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local atau .env."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


def load_state() -> dict[str, str]:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def save_state(state: dict[str, str]) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def fetch_new_records(last_timestamp: str | None) -> list[dict]:
    query = supabase.from_(SUPABASE_SYNC_TABLE).select("*")

    if last_timestamp:
        query = query.gte(SUPABASE_TIMESTAMP_FIELD, last_timestamp)

    query = query.order(SUPABASE_TIMESTAMP_FIELD, desc=False)
    
    try:
        response = query.execute()
        return response.data or []
    except Exception as exc:
        raise RuntimeError(f"Supabase query error: {exc}") from exc


def determine_latest_timestamp(records: list[dict]) -> str | None:
    values = [record.get(SUPABASE_TIMESTAMP_FIELD) for record in records if record.get(SUPABASE_TIMESTAMP_FIELD)]
    return max(values) if values else None


def write_to_hdfs(records: list[dict], file_name: str) -> None:
    client = InsecureClient(HDFS_URL, user=HDFS_USER)
    remote_dir = posixpath.join(HDFS_BASE_DIR, SUPABASE_SYNC_TABLE)
    client.makedirs(remote_dir)

    remote_path = f"{remote_dir}/{file_name}"
    payload = "\n".join(json.dumps(record, ensure_ascii=False) for record in records)

    logging.info("Menulis %s baris ke HDFS: %s", len(records), remote_path)
    client.write(remote_path, data=payload, encoding="utf-8", overwrite=True)


def write_local_backup(records: list[dict], file_name: str) -> Path:
    LOCAL_FALLBACK_DIR.mkdir(parents=True, exist_ok=True)
    target = LOCAL_FALLBACK_DIR / file_name
    target.write_text(
        "\n".join(json.dumps(record, ensure_ascii=False) for record in records),
        encoding="utf-8",
    )
    return target


def main() -> int:
    logging.info("Mulai sinkronisasi data Supabase -> Hadoop")
    state = load_state()
    last_timestamp = state.get("last_sync_timestamp")

    try:
        records = fetch_new_records(last_timestamp)
    except Exception as exc:
        logging.error("Gagal mengambil data Supabase: %s", exc)
        return 1

    if not records:
        logging.info("Tidak ada rekaman baru untuk disinkronisasi.")
        return 0

    now = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
    file_name = f"{SUPABASE_SYNC_TABLE}_{now}.json"

    try:
        write_to_hdfs(records, file_name)
    except Exception as exc:
        logging.warning("Gagal menulis ke HDFS; menyimpan backup lokal: %s", exc)
        backup_path = write_local_backup(records, file_name)
        logging.info("Backup lokal disimpan di: %s", backup_path)

    latest_timestamp = determine_latest_timestamp(records)
    if latest_timestamp:
        state["last_sync_timestamp"] = latest_timestamp
        save_state(state)
        logging.info("Memperbarui state terakhir: %s", latest_timestamp)

    logging.info("Sinkronisasi selesai dengan %s rekaman.", len(records))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
