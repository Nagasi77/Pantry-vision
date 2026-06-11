#!/usr/bin/env python3
"""Sinkronisasi data Supabase → Hadoop HDFS (+ local fallback di hdfs_sync/).

Alur:
  1. Ambil scan_sessions + scan_detections dari Supabase (incremental via last_timestamp)
  2. Tulis ke HDFS sebagai NDJSON
  3. Selalu tulis juga ke hdfs_sync/ lokal → agar Vercel bisa baca langsung

Jalankan manual atau via Windows Task Scheduler:
  python sync_supabase_to_hadoop.py
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

# hdfs opsional — kalau tidak ada, hanya simpan lokal
try:
    from hdfs import InsecureClient
    HDFS_AVAILABLE = True
except ImportError:
    HDFS_AVAILABLE = False
    logging.warning("Library `hdfs` tidak ditemukan. Hanya simpan lokal. Install: pip install hdfs")

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

# ── Path & Env ────────────────────────────────────────────────────────────────
ROOT_DIR          = Path(__file__).resolve().parent
STATE_FILE        = ROOT_DIR / "sync_state.json"
LOCAL_SYNC_DIR    = ROOT_DIR / "hdfs_sync"   # dibaca langsung oleh Vercel page

env_path = os.getenv("ENV_PATH", str(ROOT_DIR / ".env.local"))
load_dotenv(env_path)

SUPABASE_URL      = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY      = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
HDFS_URL          = os.getenv("HDFS_URL", "http://localhost:9870")
HDFS_USER         = os.getenv("HDFS_USER", "hdfs")
HDFS_BASE_DIR     = os.getenv("HDFS_BASE_DIR", "/user/pantry_vision")

# Tabel yang disync (bisa diextend di env)
SYNC_TABLES = ["scan_sessions", "scan_detections"]
TIMESTAMP_FIELDS = {
    "scan_sessions":   "scanned_at",
    "scan_detections": None,   # tidak punya kolom timestamp
}

if not SUPABASE_URL or not SUPABASE_KEY:
    raise SystemExit(
        "❌ Supabase belum dikonfigurasi. "
        "Isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local"
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ── State Management ──────────────────────────────────────────────────────────
def load_state() -> dict:
    if not STATE_FILE.exists():
        return {}
    try:
        return json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_state(state: dict) -> None:
    STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


# ── Supabase Fetch ─────────────────────────────────────────────────────────────
def fetch_records(table: str, last_timestamp: str | None) -> list[dict]:
    """Ambil record baru dari tabel Supabase secara incremental."""
    ts_field = TIMESTAMP_FIELDS.get(table)
    query    = supabase.from_(table).select("*", count="exact")

    if ts_field:
        if last_timestamp:
            # gt bukan gte agar tidak duplikat record yang sudah disync
            query = query.gt(ts_field, last_timestamp)
        query = query.order(ts_field, desc=False)

    try:
        response = query.execute()
        logging.info("[%s] %s record baru ditemukan", table, response.count or 0)
        return response.data or []
    except Exception as exc:
        raise RuntimeError(f"Supabase query error [{table}]: {exc}") from exc


def fetch_all_tables(state: dict) -> dict[str, list[dict]]:
    """Fetch semua tabel yang perlu disync."""
    result = {}
    for table in SYNC_TABLES:
        last_ts = state.get(f"last_sync_{table}")
        try:
            records = fetch_records(table, last_ts)
            result[table] = records
        except Exception as exc:
            logging.error("Gagal fetch [%s]: %s", table, exc)
            result[table] = []
    return result


def determine_latest_timestamp(records: list[dict], ts_field: str) -> str | None:
    values = [r.get(ts_field) for r in records if r.get(ts_field)]
    return max(values) if values else None


# ── Enrichment: Join scan_detections ke scan_sessions ────────────────────────
def enrich_sessions(
    sessions: list[dict],
    detections: list[dict],
) -> list[dict]:
    """
    Tambahkan field detections[] ke tiap session agar Vercel bisa tampilkan
    tanpa query tambahan.

    Output per record:
    {
        "id": "...",
        "scanned_at": "...",
        "device_source": "...",
        "item_count": 3,
        ...                     ← semua field scan_sessions
        "detections": [         ← JOIN dari scan_detections
            {
                "item_name": "Pisang",
                "raw_label": "FreshBanana",
                "freshness_status": "Segar",
                "confidence": 0.92,
                "icon": "🍌"
            },
            ...
        ]
    }
    """
    # Index detections by scan_session_id
    det_by_session: dict[str, list[dict]] = {}
    for d in detections:
        sid = d.get("scan_session_id")
        if sid:
            det_by_session.setdefault(sid, []).append(d)

    enriched = []
    for s in sessions:
        sid  = s.get("id")
        dets = det_by_session.get(sid, [])
        row  = {
            **s,
            # Field normalisasi untuk Vercel page
            "timestamp":     s.get("scanned_at"),
            "display_label": _dominant_label(dets),
            "confidence":    _avg_confidence(dets),
            "detections":    dets,
        }
        enriched.append(row)
    return enriched


def _dominant_label(dets: list[dict]) -> str:
    """Label paling banyak muncul di sesi ini."""
    if not dets:
        return "Tidak Ada Deteksi"
    counts: dict[str, int] = {}
    for d in dets:
        lbl = d.get("item_name") or d.get("raw_label") or "Unknown"
        counts[lbl] = counts.get(lbl, 0) + 1
    return max(counts, key=lambda k: counts[k])


def _avg_confidence(dets: list[dict]) -> float | None:
    vals = [float(d["confidence"]) for d in dets if d.get("confidence") is not None]
    return round(sum(vals) / len(vals), 4) if vals else None


# ── Write ke HDFS ─────────────────────────────────────────────────────────────
def write_to_hdfs(records: list[dict], table: str, file_name: str) -> None:
    if not HDFS_AVAILABLE:
        raise RuntimeError("hdfs library tidak tersedia")
    client     = InsecureClient(HDFS_URL, user=HDFS_USER)
    remote_dir = posixpath.join(HDFS_BASE_DIR, table)
    client.makedirs(remote_dir)
    remote_path = f"{remote_dir}/{file_name}"
    payload     = "\n".join(json.dumps(r, ensure_ascii=False, default=str) for r in records)
    logging.info("Menulis %s baris ke HDFS: %s", len(records), remote_path)
    client.write(remote_path, data=payload, encoding="utf-8", overwrite=True)


# ── Write ke lokal hdfs_sync/ ─────────────────────────────────────────────────
def write_local(records: list[dict], table: str, file_name: str) -> Path:
    """
    Tulis NDJSON ke hdfs_sync/<table>/<file_name>
    Folder per tabel agar mudah dibaca page.tsx.
    """
    target_dir = LOCAL_SYNC_DIR / table
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / file_name
    target.write_text(
        "\n".join(json.dumps(r, ensure_ascii=False, default=str) for r in records),
        encoding="utf-8",
    )
    logging.info("Lokal backup: %s (%s records)", target, len(records))
    return target


# ── Main ───────────────────────────────────────────────────────────────────────
def main() -> int:
    logging.info("=" * 55)
    logging.info("Mulai sinkronisasi Supabase → Hadoop")
    logging.info("=" * 55)

    state = load_state()
    now_str  = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

    # 1. Fetch semua tabel
    table_records = fetch_all_tables(state)
    sessions   = table_records.get("scan_sessions", [])
    detections = table_records.get("scan_detections", [])

    if not sessions and not detections:
        logging.info("Tidak ada record baru. Sinkronisasi selesai.")
        return 0

    # 2. Enrich sessions dengan detections
    enriched_sessions = enrich_sessions(sessions, detections)

    # 3. Tulis per tabel
    for table, records, enriched in [
        ("scan_sessions",   sessions,   enriched_sessions),
        ("scan_detections", detections, detections),
    ]:
        if not records:
            logging.info("[%s] Tidak ada record baru, skip.", table)
            continue

        file_name = f"{table}_{now_str}.json"

        # Tulis ke HDFS (opsional)
        if HDFS_AVAILABLE:
            try:
                write_to_hdfs(enriched if table == "scan_sessions" else records, table, file_name)
            except Exception as exc:
                logging.warning("[%s] HDFS gagal: %s — fallback ke lokal", table, exc)

        # Selalu tulis lokal (dibaca Vercel)
        write_local(enriched if table == "scan_sessions" else records, table, file_name)

        # Update state
        ts_field = TIMESTAMP_FIELDS.get(table, "created_at")
        latest   = determine_latest_timestamp(records, ts_field)
        if latest:
            state[f"last_sync_{table}"] = latest
            logging.info("[%s] Timestamp terakhir: %s", table, latest)

    save_state(state)
    logging.info("✅ Sinkronisasi selesai — sessions: %s, detections: %s",
                 len(sessions), len(detections))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())