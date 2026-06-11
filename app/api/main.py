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
import base64
import cv2
import numpy as np

# ── Env ───────────────────────────────────────────────────────────────────────
_here = os.path.dirname(os.path.abspath(__file__))
_env_local = os.path.join(_here, ".env.local")
if os.path.exists(_env_local):
    load_dotenv(_env_local)

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

# ── YOLO Model Paths ──────────────────────────────────────────────────────────
MODEL_IOT_PATH = os.getenv("YOLO_MODEL_IOT_PATH", 
    os.path.join(_here, "models", "best_fruit_freshness_iot_yolov8.pt"))
MODEL_SCAN_PATH = os.getenv("YOLO_MODEL_SCAN_PATH", 
    os.path.join(_here, "models", "best_fruit_freshness_multiobject_100epoch.pt"))

yolo_model_iot = None
yolo_model_scan = None

def get_model_iot():
    global yolo_model_iot
    if yolo_model_iot is None:
        print("[INIT] Loading IoT YOLO model...")
        yolo_model_iot = YOLO(MODEL_IOT_PATH)
    return yolo_model_iot

def get_model_scan():
    global yolo_model_scan
    if yolo_model_scan is None:
        print("[INIT] Loading Scan YOLO model...")
        yolo_model_scan = YOLO(MODEL_SCAN_PATH)
    return yolo_model_scan

# ── Label Mapping ─────────────────────────────────────────────────────────────
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

COCO_TO_CUSTOM: dict[int, str] = {
    46: "FreshBanana", 47: "FreshApple", 49: "FreshOrange",
    50: "FreshBellpepper", 51: "FreshCarrot", 52: "FreshTomato",       
}

def _get_label(cls_idx: int, model=None) -> str:
    model_name = model.names.get(cls_idx, "") if model else ""
    if model_name.startswith(("Fresh", "Rotten")):
        return model_name
    if cls_idx in COCO_TO_CUSTOM:
        return COCO_TO_CUSTOM[cls_idx]
    if cls_idx < len(CUSTOM_LABELS):
        return CUSTOM_LABELS[cls_idx]
    return None  

NAME_MAP: dict[str, str] = {
    "Apple": "Apel", "Banana": "Pisang", "Bellpepper": "Paprika",
    "Bittergourd": "Pare", "Capsicum": "Cabai", "Carrot": "Wortel",
    "Cucumber": "Timun", "Mango": "Mangga", "Okara": "Okra",
    "Okra": "Okra", "Orange": "Jeruk", "Potato": "Kentang",
    "Strawberry": "Stroberi", "Tomato": "Tomat",
}

EMOJI_MAP: dict[str, str] = {
    "Apple": "🍎", "Banana": "🍌", "Bellpepper": "🫑", "Bittergourd": "🥒",
    "Capsicum": "🌶️", "Carrot": "🥕", "Cucumber": "🥒", "Mango": "🥭",
    "Okara": "🌿", "Okra": "🌿", "Orange": "🍊", "Potato": "🥔",
    "Strawberry": "🍓", "Tomato": "🍅",
}

def parse_label(raw: str) -> dict:
    if raw.startswith("Fresh"):
        status, commodity = "Segar", raw[5:]
    elif raw.startswith("Rotten"):
        status, commodity = "Busuk", raw[6:]
    else:
        status, commodity = "Segar", raw
    return {
        "raw_label": raw,
        "item_name": NAME_MAP.get(commodity, commodity),
        "freshness_status": status,
        "icon": EMOJI_MAP.get(commodity, "📦"),
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

async def trigger_spoilage_alert(detections: list[dict]):
    """Kirim email alert otomatis ke semua user jika ada bahan busuk terdeteksi."""
    rotten = [d for d in detections if d["freshness_status"] == "Busuk"]
    if not rotten:
        return
    import httpx
    NEXTJS_URL = os.getenv("NEXTJS_URL", "https://pantry-vision-eight.vercel.app")
    now = datetime.now(timezone.utc).strftime("%d %b %Y, %H:%M WIB")
    for item in rotten:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                await client.post(
                    f"{NEXTJS_URL}/api/alert/spoilage",
                    json={
                        "type": "freshness",
                        "itemName": item["item_name"],
                        "freshnessStatus": item["freshness_status"],
                        "confidence": round(item["confidence"] * 100, 1),
                        "scannedAt": now,
                    },
                )
            print(f"[Alert] Email terkirim: {item['item_name']} busuk")
        except Exception as e:
            print(f"[Alert] Gagal kirim email untuk {item['item_name']}: {e}")

# ── Supabase Helpers (ONLY for non-landing) ───────────────────────────────────
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
    if not supabase:
        return
    counts: dict[str, dict] = {}
    for det in detections:
        key = det["item_name"]
        if key not in counts:
            counts[key] = {**det, "quantity": 0}
        counts[key]["quantity"] += 1
        if det["freshness_status"] == "Busuk":
            counts[key]["freshness_status"] = "Busuk"
    try:
        supabase.table("pantry_items").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
        rows = [
            {
                "id": str(uuid.uuid4()),
                "item_name": v["item_name"],
                "quantity": v["quantity"],
                "freshness_status": v["freshness_status"],
                "icon": v["icon"],
                "scan_session_id": scan_session_id,
                "last_scanned_at": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat(),
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
            "id": session_id,
            "scanned_at": datetime.now(timezone.utc).isoformat(),
            "image_url": image_url,
            "device_source": source,
            "item_count": len(detections),
            "gas_status": gas,
            "jarak_cm": jarak,
        }).execute()
        det_rows = [
            {
                "id": str(uuid.uuid4()),
                "scan_session_id": session_id,
                "item_name": d["item_name"],
                "raw_label": d["raw_label"],
                "freshness_status": d["freshness_status"],
                "confidence": round(float(d["confidence"]), 4),
                "icon": d["icon"],
            }
            for d in detections
        ]
        if det_rows:
            supabase.table("scan_detections").insert(det_rows).execute()
    except Exception as e:
        print(f"[DB] save_scan_session error: {e}")

# ── ENDPOINTS ─────────────────────────────────────────────────────────────────

@app.post("/predict/scan")
async def predict_scan(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    source: str = "IoT",
    gas: str | None = None,
    jarak: float | None = None,
    skip_storage: str = "false",
):
    contents = await file.read()
    session_id = str(uuid.uuid4())
    
    # LANDING PAGE: langsung return tanpa menyimpan
    if source == "Landing-Scan":
        print(f"⚠️ [LANDING] Scan dari landing page, TIDAK disimpan. session={session_id}")
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        model_scan = get_model_scan()
        results = model_scan(image, conf=0.35, verbose=False)
        detections = []
        for result in results:
            for box in result.boxes:
                cls_idx = int(box.cls[0])
                conf = float(box.conf[0])
                raw_label = _get_label(cls_idx, model_scan)
                if raw_label is None:
                    continue
                parsed = parse_label(raw_label)
                detections.append({**parsed, "confidence": conf})
        publish_kondisi(detections)
        return {
            "status": "success",
            "session_id": session_id,
            "image_url": None,
            "item_count": len(detections),
            "detections": [
                {
                    "item_name": d["item_name"],
                    "freshness_status": d["freshness_status"],
                    "confidence": round(d["confidence"] * 100, 1),
                    "icon": d["icon"],
                }
                for d in detections
            ],
            "has_rotten": any(d["freshness_status"] == "Busuk" for d in detections),
        }
    
    # NON-LANDING: proses normal
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    model_scan = get_model_scan()
    results = model_scan(image, conf=0.35, verbose=False)
    detections = []
    for result in results:
        for box in result.boxes:
            cls_idx = int(box.cls[0])
            conf = float(box.conf[0])
            raw_label = _get_label(cls_idx, model_scan)
            if raw_label is None:
                continue
            parsed = parse_label(raw_label)
            detections.append({**parsed, "confidence": conf})
    publish_kondisi(detections)
    image_url = upload_image_to_supabase(contents, f"scan_{session_id}.jpg")
    background_tasks.add_task(save_scan_session, session_id, image_url, detections, source, gas, jarak)
    background_tasks.add_task(replace_pantry_items, detections, session_id)
    background_tasks.add_task(trigger_spoilage_alert, detections)
    return {
        "status": "success",
        "session_id": session_id,
        "image_url": image_url,
        "item_count": len(detections),
        "detections": [
            {
                "item_name": d["item_name"],
                "freshness_status": d["freshness_status"],
                "confidence": round(d["confidence"] * 100, 1),
                "icon": d["icon"],
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
    skip_storage: str = "false",
):
    contents = await file.read()
    session_id = str(uuid.uuid4())
    
    # LANDING PAGE: langsung return tanpa menyimpan
    if source == "Landing-Scan":
        print(f"⚠️ [LANDING] Annotated scan dari landing page, TIDAK disimpan. session={session_id}")
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        model_scan = get_model_scan()
        results = model_scan(image, conf=0.35, verbose=False)
        detections = []
        for result in results:
            for box in result.boxes:
                cls_idx = int(box.cls[0])
                conf = float(box.conf[0])
                raw_label = _get_label(cls_idx, model_scan)
                if raw_label is None:
                    continue
                parsed = parse_label(raw_label)
                x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                detections.append({**parsed, "confidence": conf, "bbox": [x1, y1, x2, y2]})
        # Buat annotated image
        img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        COLOR_FRESH = (34, 197, 94)
        COLOR_ROTTEN = (68, 68, 239)
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            color = COLOR_FRESH if det["freshness_status"] == "Segar" else COLOR_ROTTEN
            label_text = f"{det['icon']} {det['item_name']} {round(det['confidence']*100)}%"
            cv2.rectangle(img_cv, (x1, y1), (x2, y2), color, 3)
            (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)
            cv2.rectangle(img_cv, (x1, y1 - th - 12), (x1 + tw + 10, y1), color, -1)
            cv2.putText(img_cv, label_text, (x1 + 5, y1 - 6), cv2.FONT_HERSHEY_DUPLEX, 0.6, (255,255,255), 1, cv2.LINE_AA)
        _, buffer = cv2.imencode(".jpg", img_cv, [cv2.IMWRITE_JPEG_QUALITY, 90])
        annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()
        publish_kondisi(detections)
        return {
            "status": "success",
            "session_id": session_id,
            "image_url": None,
            "annotated_url": None,
            "annotated_b64": annotated_b64,
            "item_count": len(detections),
            "detections": [
                {
                    "item_name": d["item_name"],
                    "freshness_status": d["freshness_status"],
                    "confidence": round(d["confidence"] * 100, 1),
                    "icon": d["icon"],
                    "bbox": d["bbox"],
                }
                for d in detections
            ],
            "has_rotten": any(d["freshness_status"] == "Busuk" for d in detections),
        }
    
    # NON-LANDING: proses normal
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    model_scan = get_model_scan()
    results = model_scan(image, conf=0.35, verbose=False)
    detections = []
    for result in results:
        for box in result.boxes:
            cls_idx = int(box.cls[0])
            conf = float(box.conf[0])
            raw_label = _get_label(cls_idx, model_scan)
            if raw_label is None:
                continue
            parsed = parse_label(raw_label)
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            detections.append({**parsed, "confidence": conf, "bbox": [x1, y1, x2, y2]})
    # Buat annotated image
    img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    COLOR_FRESH = (34, 197, 94)
    COLOR_ROTTEN = (68, 68, 239)
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = COLOR_FRESH if det["freshness_status"] == "Segar" else COLOR_ROTTEN
        label_text = f"{det['icon']} {det['item_name']} {round(det['confidence']*100)}%"
        cv2.rectangle(img_cv, (x1, y1), (x2, y2), color, 3)
        (tw, th), _ = cv2.getTextSize(label_text, cv2.FONT_HERSHEY_DUPLEX, 0.6, 1)
        cv2.rectangle(img_cv, (x1, y1 - th - 12), (x1 + tw + 10, y1), color, -1)
        cv2.putText(img_cv, label_text, (x1 + 5, y1 - 6), cv2.FONT_HERSHEY_DUPLEX, 0.6, (255,255,255), 1, cv2.LINE_AA)
    _, buffer = cv2.imencode(".jpg", img_cv, [cv2.IMWRITE_JPEG_QUALITY, 90])
    annotated_b64 = "data:image/jpeg;base64," + base64.b64encode(buffer).decode()
    publish_kondisi(detections)
    # Simpan
    image_url = upload_image_to_supabase(contents, f"scan_{session_id}.jpg")
    ann_url = upload_image_to_supabase(bytes(buffer), f"annotated_{session_id}.jpg")
    background_tasks.add_task(save_scan_session, session_id, ann_url, detections, source, gas, jarak)
    background_tasks.add_task(replace_pantry_items, detections, session_id)
    background_tasks.add_task(trigger_spoilage_alert, detections)
    return {
        "status": "success",
        "session_id": session_id,
        "image_url": image_url,
        "annotated_url": ann_url,
        "annotated_b64": annotated_b64,
        "item_count": len(detections),
        "detections": [
            {
                "item_name": d["item_name"],
                "freshness_status": d["freshness_status"],
                "confidence": round(d["confidence"] * 100, 1),
                "icon": d["icon"],
                "bbox": d["bbox"],
            }
            for d in detections
        ],
        "has_rotten": any(d["freshness_status"] == "Busuk" for d in detections),
    }


@app.get("/health")
async def health_check():
    return {"status": "ok", "supabase_connected": supabase is not None}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)