from fastapi import FastAPI, File, UploadFile, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import os
import uvicorn
import paho.mqtt.client as mqtt

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.path.exists("static"):
    os.makedirs("static")

app.mount("/static", StaticFiles(directory="static"), name="static")

model = tf.keras.models.load_model("model_kesegaran.keras")

with open("labels.txt", "r") as f:
    labels = f.read().splitlines()

latest_iot_data = {
    "label": "Belum Ada Objek",
    "confidence": 0,
    "saran": "Tempatkan buah apel di dalam jangkauan sensor.",
    "image_url": None
}

ML_MAP = {
    "Apple_Normal": {"label": "Normal (Segar)", "pct": 95, "saran": "Konsumsi langsung atau simpan di dalam kulkas."},
    "Apple_Blotch": {"label": "Bercak (Cukup Segar)", "pct": 60, "saran": "Kupas bagian kulit yang bercak sebelum dikonsumsi."},
    "Apple_Scab": {"label": "Scab (Cukup Segar)", "pct": 55, "saran": "Potong bagian yang rusak dan jadikan olahan kue."},
    "Apple_Rot": {"label": "Busuk (Kurang Segar)", "pct": 15, "saran": "Buah sudah busuk. Segera buang dari pantry."}
}

mqtt_client = mqtt.Client()
mqtt_client.connect("broker.hivemq.com", 1883, 60)
mqtt_client.loop_start()

def process_image(contents):
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image = image.resize((224, 224))
    img_array = np.array(image) / 255.0
    return np.expand_dims(img_array, axis=0)

@app.post("/predict/manual")
async def predict_manual(file: UploadFile = File(...)):
    contents = await file.read()
    img_array = process_image(contents)
    predictions = model.predict(img_array)
    index = np.argmax(predictions[0])
    return {
        "source": "Manual Scan",
        "label": labels[index],
        "confidence": round(float(np.max(predictions[0])) * 100, 2)
    }

@app.post("/predict/iot")
async def predict_iot(request: Request, file: UploadFile = File(...)):
    global latest_iot_data
    contents = await file.read()
    
    image_path = os.path.join("static", "latest_pantry.jpg")
    with open(image_path, "wb") as f:
        f.write(contents)
        
    img_array = process_image(contents)
    predictions = model.predict(img_array)
    index = np.argmax(predictions[0])
    raw_label = labels[index]
    
    info = ML_MAP.get(raw_label, {"label": raw_label, "pct": 50, "saran": "Kondisi tidak dikenal."})
    
    latest_iot_data = {
        "label": info["label"],
        "confidence": info["pct"],
        "saran": info["saran"],
        "image_url": "http://localhost:8000/static/latest_pantry.jpg"
    }

    kondisi_led = "BUSUK"
    if raw_label == "Apple_Normal":
        kondisi_led = "SEGAR"
    elif raw_label == "Apple_Blotch" or raw_label == "Apple_Scab":
        kondisi_led = "WASPADA"
        
    mqtt_client.publish("pantry/kondisi", kondisi_led)
    
    return {"status": "Success", "processed_label": raw_label}

@app.get("/predict/iot-latest")
async def get_iot_latest():
    return latest_iot_data

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)