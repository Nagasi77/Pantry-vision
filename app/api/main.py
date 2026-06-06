from fastapi import FastAPI, File, UploadFile, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io
import os
import uvicorn
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone
import uuid

# ── Env ───────────────────────────────────────────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
_root = os.path.abspath(os.path.join(_here, "..", ".."))

# Load .env.local hanya jika ada (untuk local dev; diabaikan di Azure)
_env_local = os.path.join(_here, ".env.local")
if os.path.exists(_env_local):
    load_dotenv(_env_local)
_env_root = os.path.join(_root, ".env.local")
if os.path.exists(_env_root):
    load_dotenv(_env_root)

# ── Supabase ──────────────────────────────────────────────────────────────────
SUPABASE_URL  = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY  = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "scan_images")

supabase: Client = None
if SUPABASE_URL and SUPABASE_KEY:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(title="PantryVision AI Backend")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── YOLO — 26 kelas custom ────────────────────────────────────────────────────

# ── Resolve model path 
_default_model = os.path.join(_here, "models", "best_fruit_freshness_yolov8.pt")
MODEL_PATH = os.getenv("YOLO_MODEL_PATH", _default_model)

if not os.path.exists(MODEL_PATH):
    print(f"[WARN] Model tidak ditemukan di {MODEL_PATH}")

yolo_model = None

def get_model():
    """Lazy load YOLO model on first request."""
    global yolo_model
    if yolo_model is None:
        print("[INIT] Loading YOLO model...")
        yolo_model = YOLO(MODEL_PATH)
        print("[INIT] YOLO model loaded successfully")
    return yolo_model

# 26 label sesuai urutan yang dikirim (index 0-25)
CUSTOM_LABELS: list[str] = [
    "FreshApple", "FreshBanana", "FreshBellpepper", "FreshBittergourd",
    "FreshCapsicum", "FreshCarrot", "FreshCucumber", "FreshMango",
    "FreshOkara", "FreshOrange", "FreshPotato", "FreshStrawberry",
    "FreshTomato",
    "RottenApple", "RottenBanana", "RottenBellpepper", "RottenBittergourd",
    "RottenCapsicum", "RottenCarrot", "RottenCucumber", "RottenMango",
    "RottenOkra", "RottenOrange", "RottenPotato", "RottenStrawberry",
    "RottenTomato",
]

# Mapping COCO index → label custom 
COCO_TO_CUSTOM: dict[int, str] = {
    46: "FreshBanana",
    47: "FreshApple",
    49: "FreshOrange",
    50: "FreshBellpepper",  
    51: "FreshCarrot",
    52: "FreshTomato",       
}

def _get_label(cls_idx: int) -> str:
    model_name = yolo_model.names.get(cls_idx, "")
    if model_name.startswith(("Fresh", "Rotten")):
        return model_name
    if cls_idx in COCO_TO_CUSTOM:
        return COCO_TO_CUSTOM[cls_idx]
    if cls_idx < len(CUSTOM_LABELS):
        return CUSTOM_LABELS[cls_idx]
    return None  

NAME_MAP: dict[str, str] = {
    "Apple": "Apel",       "Banana": "Pisang",      "Bellpepper": "Paprika",
    "Bittergourd": "Pare", "Capsicum": "Cabai",     "Carrot": "Wortel",
    "Cucumber": "Timun",   "Mango": "Mangga",       "Okara": "Okra",
    "Okra": "Okra",        "Orange": "Jeruk",       "Potato": "Kentang",
    "Strawberry": "Stroberi", "Tomato": "Tomat",
}

EMOJI_MAP: dict[str, str] = {
    "Apple": "🍎",  "Banana": "🍌",  "Bellpepper": "🫑",
    "Bittergourd": "🥒", "Capsicum": "🌶️", "Carrot": "🥕",
    "Cucumber": "🥒", "Mango": "🥭", "Okara": "🌿",
    "Okra": "🌿",   "Orange": "🍊", "Potato": "🥔",
    "Strawberry": "🍓", "Tomato": "🍅",
}


def parse_label(raw: str) -> dict:
    """Pisahkan Fresh/Rotten dari nama komoditas, kembalikan dict lengkap."""
    if raw.startswith("Fresh"):
        status, commodity = "Segar", raw[5:]
    elif raw.startswith("Rotten"):
        status, commodity = "Busuk", raw[6:]
    else:
        status, commodity = "Segar", raw  # default segar jika tidak dikenal

    return {
        "raw_label":        raw,
        "item_name":        NAME_MAP.get(commodity, commodity),
        "freshness_status": status,
        "icon":             EMOJI_MAP.get(commodity, "📦"),
    }


# ── MQTT ──────────────────────────────────────────────────────────────────────
mqtt_client = mqtt.Client()
try:
    mqtt_client.connect("broker.hivemq.com", 1883, 60)
    mqtt_client.loop_start()
except Exception as e:
    print(f"[MQTT] Gagal koneksi: {e}")


def publish_kondisi(detections: list[dict]):
    kondisi = "BUSUK" if any(d["freshness_status"] == "Busuk" for d in detections) \
              else "SEGAR" if detections else "TIDAK_DIKETAHUI"
    try:
        mqtt_client.publish("pantry/kondisi", kondisi)
    except Exception:
        pass


# ── Supabase helpers ──────────────────────────────────────────────────────────

def upload_image_to_supabase(image_bytes: bytes, filename: str) -> str | None:
    if not supabase:
        return None
    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=filename,
            file=image_bytes,
            file_options={"content-type": "image/jpeg", "upsert": "true"},
        )
        return supabase.storage.from_(SUPABASE_BUCKET).get_public_url(filename)
    except Exception as e:
        print(f"[Storage] Upload gagal: {e}")
        return None


def replace_pantry_items(detections: list[dict], scan_session_id: str):
    """Replace seluruh pantry_items dengan hasil scan terbaru."""
    if not supabase:
        return

    # Agregasi: komoditas unik → quantity
    counts: dict[str, dict] = {}
    for det in detections:
        key = det["item_name"]
        if key not in counts:
            counts[key] = {**det, "quantity": 0}
        counts[key]["quantity"] += 1
        # Jika ada satu busuk, status jadi Busuk
        if det["freshness_status"] == "Busuk":
            counts[key]["freshness_status"] = "Busuk"

    try:
        supabase.table("pantry_items").delete() \
            .neq("id", "00000000-0000-0000-0000-000000000000").execute()

        rows = [
            {
                "id":               str(uuid.uuid4()),
                "item_name":        v["item_name"],
                "quantity":         v["quantity"],
                "freshness_status": v["freshness_status"],
                "icon":             v["icon"],
                "scan_session_id":  scan_session_id,
                "last_scanned_at":  datetime.now(timezone.utc).isoformat(),
                "created_at":       datetime.now(timezone.utc).isoformat(),
            }
            for v in counts.values()
        ]
        if rows:
            supabase.table("pantry_items").insert(rows).execute()
    except Exception as e:
        print(f"[DB] replace_pantry_items error: {e}")


async def save_scan_session(
    session_id: str,
    image_url: str | None,
    detections: list[dict],
    source: str,
    gas: str | None = None,
    jarak: float | None = None,
):
    if not supabase:
        return
    try:
        supabase.table("scan_sessions").insert({
            "id":            session_id,
            "scanned_at":    datetime.now(timezone.utc).isoformat(),
            "image_url":     image_url,
            "device_source": source,
            "item_count":    len(detections),
            "gas_status":    gas,
            "jarak_cm":      jarak,
        }).execute()

        det_rows = [
            {
                "id":               str(uuid.uuid4()),
                "scan_session_id":  session_id,
                "item_name":        d["item_name"],
                "raw_label":        d["raw_label"],
                "freshness_status": d["freshness_status"],
                "confidence":       round(float(d["confidence"]), 4),
                "icon":             d["icon"],
            }
            for d in detections
        ]
        if det_rows:
            supabase.table("scan_detections").insert(det_rows).execute()
    except Exception as e:
        print(f"[DB] save_scan_session error: {e}")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/predict/scan")
async def predict_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: str = "IoT",
    gas: str | None = None,
    jarak: float | None = None,
):
    """
    Terima foto, jalankan YOLO, simpan scan_session + scan_detections,
    replace pantry_items dengan hasil terbaru.
    """
    contents = await file.read()
    session_id = str(uuid.uuid4())
    print(f"[API] /predict/iot received: {len(contents)} bytes, session={session_id}")

    # Upload ke Supabase Storage (tidak simpan lokal)
    image_url = upload_image_to_supabase(contents, f"scan_{session_id}.jpg")
    if not image_url:
        image_url = None
        print("[WARN] Foto tidak tersimpan, Supabase storage belum dikonfigurasi.")

    image   = Image.open(io.BytesIO(contents)).convert("RGB")
    results = get_model()(image, conf=0.35, verbose=False)

    detections: list[dict] = []
    for result in results:
        for box in result.boxes:
            cls_idx   = int(box.cls[0])
            conf      = float(box.conf[0])
            raw_label = _get_label(cls_idx)
            if raw_label is None:
                continue   # skip kelas COCO non-produce
            parsed    = parse_label(raw_label)
            detections.append({**parsed, "confidence": conf})

    publish_kondisi(detections)

    background_tasks.add_task(save_scan_session, session_id, image_url, detections, source, gas, jarak)
    background_tasks.add_task(replace_pantry_items, detections, session_id)

    return {
        "status":      "success",
        "session_id":  session_id,
        "image_url":   image_url,
        "item_count":  len(detections),
        "detections": [
            {
                "item_name":        d["item_name"],
                "freshness_status": d["freshness_status"],
                "confidence":       round(d["confidence"] * 100, 1),
                "icon":             d["icon"],
            }
            for d in detections
        ],
        "has_rotten": any(d["freshness_status"] == "Busuk" for d in detections),
    }


@app.post("/predict/scan-annotated")
async def predict_scan_annotated(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: str = "IoT",
    gas: str | None = None,
    jarak: float | None = None,
):
    """
    Sama seperti /predict/scan, tapi juga mengembalikan gambar
    hasil anotasi YOLO (bounding box + label) sebagai base64.
    """
    import base64
    import cv2
    import numpy as np_cv

    contents = await file.read()
    session_id = str(uuid.uuid4())

    # Upload original ke Supabase Storage (tidak simpan lokal)
    local_filename = f"scan_{session_id}.jpg"
    image_url = upload_image_to_supabase(contents, local_filename)
    if not image_url:
        # Supabase gagal — lanjut tanpa URL gambar
        image_url = None
        print(f"[WARN] Foto tidak tersimpan, Supabase storage belum dikonfigurasi.")

    # Jalankan YOLO
    image   = Image.open(io.BytesIO(contents)).convert("RGB")
    results = get_model()(image, conf=0.35, verbose=False)

    detections: list[dict] = []
    for result in results:
        for box in result.boxes:
            cls_idx   = int(box.cls[0])
            conf      = float(box.conf[0])
            raw_label = _get_label(cls_idx)
            if raw_label is None:
                continue   # skip non-produce
            parsed    = parse_label(raw_label)
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            detections.append({**parsed, "confidence": conf, "bbox": [x1, y1, x2, y2]})

    # ── Gambar bounding box di atas foto ─────────────────────────────────
    img_cv = cv2.cvtColor(np_cv.array(image), cv2.COLOR_RGB2BGR)

    COLOR_FRESH  = (34, 197, 94)   # hijau
    COLOR_ROTTEN = (68, 68, 239)   # merah (BGR)

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = COLOR_FRESH if det["freshness_status"] == "Segar" else COLOR_ROTTEN
        label_text = f"{det['icon']} {det['item_name']} {round(det['confidence']*100)}%"

        cv2.rectangle(img_cv, (x1, y1), (x2, y2), color, 3)

        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)
        cv2.rectangle(img_cv, (x1, y1 - th - 12), (x1 + tw + 10, y1), color, -1)
        cv2.putText(
            img_cv, label_text, (x1 + 5, y1 - 6),
            cv2.FONT_HERSHEY_DUPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA
        )

    # Encode ke JPEG → base64
    _, buffer = cv2.imencode(".jpg", img_cv, [cv2.IMWRITE_JPEG_QUALITY, 90])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()

    # Upload annotated ke Supabase Storage (tidak simpan lokal)
    ann_filename = f"annotated_{session_id}.jpg"
    ann_bytes = bytes(buffer)
    ann_url = upload_image_to_supabase(ann_bytes, ann_filename)
    if not ann_url:
        ann_url = None
        print(f"[WARN] Foto annotated tidak tersimpan.")

    publish_kondisi(detections)
    background_tasks.add_task(save_scan_session, session_id, ann_url, detections, source, gas, jarak)
    background_tasks.add_task(replace_pantry_items, detections, session_id)

    return {
        "status":        "success",
        "session_id":    session_id,
        "image_url":     image_url,
        "annotated_url": ann_url,
        "annotated_b64": annotated_b64,
        "item_count":    len(detections),
        "detections": [
            {
                "item_name":        d["item_name"],
                "freshness_status": d["freshness_status"],
                "confidence":       round(d["confidence"] * 100, 1),
                "icon":             d["icon"],
                "bbox":             d["bbox"],
            }
            for d in detections
        ],
        "has_rotten": any(d["freshness_status"] == "Busuk" for d in detections),
    }
async def get_latest_session():
    if not supabase:
        return {"session": None, "detections": []}
    try:
        sess = supabase.table("scan_sessions").select("*") \
            .order("scanned_at", desc=True).limit(1).single().execute()
        if not sess.data:
            return {"session": None, "detections": []}
        dets = supabase.table("scan_detections").select("*") \
            .eq("scan_session_id", sess.data["id"]).execute()
        return {"session": sess.data, "detections": dets.data or []}
    except Exception as e:
        print(f"[API] get_latest_session error: {e}")
        return {"session": None, "detections": []}


@app.post("/predict/iot")
async def predict_iot(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
):
    """
    Endpoint khusus IoT (ESP32-CAM).
    Kirim foto dari ESP32-CAM, return detections dengan format minimal.
    """
    contents = await file.read()
    session_id = str(uuid.uuid4())

    # Jalankan YOLO
    image   = Image.open(io.BytesIO(contents)).convert("RGB")
    results = get_model()(image, conf=0.35, verbose=False)

    detections: list[dict] = []
    for result in results:
        for box in result.boxes:
            cls_idx   = int(box.cls[0])
            conf      = float(box.conf[0])
            raw_label = _get_label(cls_idx)
            if raw_label is None:
                continue
            parsed    = parse_label(raw_label)
            detections.append({**parsed, "confidence": conf})

    print(f"[API] /predict/iot -> detections: {len(detections)} items")

    # Publish status ke MQTT
    publish_kondisi(detections)

    # Simpan ke Supabase (background task, tidak menunggu)
    image_url = upload_image_to_supabase(contents, f"iot_{session_id}.jpg")
    background_tasks.add_task(save_scan_session, session_id, image_url, detections, "IoT", None, None)
    background_tasks.add_task(replace_pantry_items, detections, session_id)

    # Response minimal untuk IoT
    return {
        "status": "success",
        "session_id": session_id,
        "item_count": len(detections),
        "detections": [
            {
                "item_name": d["item_name"],
                "freshness_status": d["freshness_status"],
                "confidence": round(d["confidence"] * 100, 1),
            }
            for d in detections
        ],
    }


@app.get("/health")
async def health_check():
    model = get_model()
    return {
        "status":            "PantryVision AI berjalan",
        "supabase_connected": supabase is not None,
        "model":             MODEL_PATH,
        "total_classes":     len(model.names),
        "using_custom_labels": not model.names.get(0, "").startswith("Fresh"),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
