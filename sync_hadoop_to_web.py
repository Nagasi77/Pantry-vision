#!/usr/bin/env python3
"""Sinkronisasi data HDFS lokal → format ringkasan untuk Vercel.

Script ini membaca semua file NDJSON di hdfs_sync/ dan menghasilkan
satu file summary JSON yang bisa dibaca Next.js page tanpa fs.readdir loop.

Output: hdfs_sync/summary.json

Jalankan setelah sync_supabase_to_hadoop.py, atau otomatis via Task Scheduler.
Urutan:
  1. python sync_supabase_to_hadoop.py   (Supabase → hdfs_sync/)
  2. python sync_hadoop_to_web.py        (hdfs_sync/ → summary.json)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

ROOT_DIR       = Path(__file__).resolve().parent
SYNC_DIR       = ROOT_DIR / "hdfs_sync"
SUMMARY_FILE   = SYNC_DIR / "summary.json"
SESSIONS_DIR   = SYNC_DIR / "scan_sessions"
DETECTIONS_DIR = SYNC_DIR / "scan_detections"


# ── Reader ─────────────────────────────────────────────────────────────────────
def read_ndjson_dir(directory: Path) -> list[dict]:
    """Baca semua .json NDJSON file dari satu folder, return list of records."""
    if not directory.exists():
        return []
    records = []
    for f in sorted(directory.glob("*.json")):
        try:
            for line in f.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line:
                    records.append(json.loads(line))
        except Exception as exc:
            logging.warning("Skip file %s: %s", f.name, exc)
    return records


# ── Aggregasi ──────────────────────────────────────────────────────────────────
def build_summary(sessions: list[dict], detections: list[dict]) -> dict:
    """Bangun summary JSON untuk dikonsumsi Vercel page.tsx."""

    # ── Per-detection stats ────────────────────────────────────────────────────
    label_counter: Counter = Counter()
    conf_values: list[float] = []
    date_stats: dict[str, dict] = {}

    for det in detections:
        lbl  = (det.get("display_label") or det.get("item_name")
                or det.get("raw_label") or det.get("label") or "Unknown")
        conf = det.get("confidence")
        ts   = det.get("created_at") or det.get("timestamp") or det.get("scanned_at")

        label_counter[lbl] += 1

        if conf is not None:
            try:
                c = float(conf)
                # Normalise ke 0-100
                conf_pct = c if c > 1 else c * 100
                conf_values.append(conf_pct)
            except (TypeError, ValueError):
                pass

        if ts:
            try:
                date_key = str(ts)[:10]   # YYYY-MM-DD
                if date_key not in date_stats:
                    date_stats[date_key] = {"count": 0, "conf_sum": 0.0, "conf_count": 0}
                date_stats[date_key]["count"] += 1
                if conf is not None:
                    date_stats[date_key]["conf_sum"]   += conf_pct  # type: ignore[possibly-undefined]
                    date_stats[date_key]["conf_count"] += 1
            except Exception:
                pass

    # 14-day trend
    today = datetime.now(timezone.utc).date()
    trend = []
    for i in range(13, -1, -1):
        from datetime import timedelta
        d   = today - timedelta(days=i)
        key = str(d)
        entry = date_stats.get(key, {"count": 0, "conf_sum": 0.0, "conf_count": 0})
        avg_c = round(entry["conf_sum"] / entry["conf_count"], 1) \
                if entry["conf_count"] > 0 else None
        trend.append({"date": key, "count": entry["count"], "avgConfidence": avg_c})

    # ── Per-session recent ─────────────────────────────────────────────────────
    sorted_sessions = sorted(
        sessions,
        key=lambda s: s.get("scanned_at") or s.get("timestamp") or "",
        reverse=True,
    )

    recent_sessions = []
    for s in sorted_sessions[:20]:
        nested_dets = s.get("detections", [])
        # Ambil label dari nested detections kalau session sendiri tidak punya
        session_label = s.get("display_label")
        if not session_label and nested_dets:
            session_label = (nested_dets[0].get("display_label")
                             or nested_dets[0].get("item_name")
                             or nested_dets[0].get("raw_label"))
        recent_sessions.append({
            "id":             s.get("id"),
            "timestamp":      s.get("scanned_at") or s.get("timestamp"),
            "display_label":  session_label or "—",
            "confidence":     s.get("confidence"),
            "device_source":  s.get("device_source"),
            "item_count":     s.get("item_count") or len(nested_dets),
            "has_rotten":     any(
                d.get("freshness_status") in ("Busuk", "Rotten", "rotten", "busuk")
                for d in nested_dets
            ),
            "detections": nested_dets,
        })

    # ── Files list ─────────────────────────────────────────────────────────────
    files_info = []
    for table_dir in [SESSIONS_DIR, DETECTIONS_DIR]:
        if table_dir.exists():
            for f in sorted(table_dir.glob("*.json")):
                size_kb = round(f.stat().st_size / 1024, 1)
                files_info.append({
                    "file":   f"{table_dir.name}/{f.name}",
                    "size_kb": size_kb,
                })

    avg_conf = round(sum(conf_values) / len(conf_values), 1) if conf_values else None

    return {
        "generated_at":   datetime.now(timezone.utc).isoformat(),
        "total_detections": len(detections),
        "total_sessions":   len(sessions),
        "unique_labels":    len(label_counter),
        "avg_confidence":   avg_conf,
        "files_count":      len(files_info),
        "top_labels":       [
            {"label": lbl, "count": cnt}
            for lbl, cnt in label_counter.most_common(10)
        ],
        "trend_14d":        trend,
        "recent_sessions":  recent_sessions,
        "files":            files_info,
    }


# ── Main ───────────────────────────────────────────────────────────────────────
def main() -> int:
    logging.info("Membaca hdfs_sync/ → membangun summary.json untuk Vercel")

    sessions   = read_ndjson_dir(SESSIONS_DIR)
    detections = read_ndjson_dir(DETECTIONS_DIR)

    logging.info("Sessions  : %s records", len(sessions))
    logging.info("Detections: %s records", len(detections))

    # Fallback: kalau scan_detections kosong tapi sessions punya nested detections
    if not detections and sessions:
        logging.info("scan_detections kosong — mengambil detections dari nested sessions...")
        for s in sessions:
            for d in s.get("detections", []):
                # Pastikan ada timestamp dari parent session kalau detection tidak punya
                if not d.get("created_at") and not d.get("timestamp"):
                    d["created_at"] = s.get("scanned_at") or s.get("timestamp")
                detections.append(d)
        logging.info("Detections (dari nested): %s records", len(detections))

    if not sessions and not detections:
        logging.warning("hdfs_sync/ kosong. Jalankan sync_supabase_to_hadoop.py terlebih dahulu.")
        # Tetap tulis summary kosong agar Vercel tidak error
        SYNC_DIR.mkdir(parents=True, exist_ok=True)
        SUMMARY_FILE.write_text(json.dumps({
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "total_detections": 0, "total_sessions": 0,
            "unique_labels": 0, "avg_confidence": None,
            "files_count": 0, "top_labels": [],
            "trend_14d": [], "recent_sessions": [], "files": [],
        }, indent=2, ensure_ascii=False), encoding="utf-8")
        return 0

    summary = build_summary(sessions, detections)
    SYNC_DIR.mkdir(parents=True, exist_ok=True)
    SUMMARY_FILE.write_text(
        json.dumps(summary, indent=2, ensure_ascii=False, default=str),
        encoding="utf-8",
    )
    logging.info("✅ summary.json ditulis ke: %s", SUMMARY_FILE)
    logging.info("   Total sessions  : %s", summary["total_sessions"])
    logging.info("   Total detections: %s", summary["total_detections"])
    logging.info("   Avg confidence  : %s%%", summary["avg_confidence"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())