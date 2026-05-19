from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import tensorflow as tf
import numpy as np
from PIL import Image
import io
import uvicorn

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model khusus apel hasil training Kaggle
model = tf.keras.models.load_model("model_kesegaran.keras")

# Urutan label: Apple_Blotch, Apple_Normal, Apple_Rot, Apple_Scab
with open("labels.txt", "r") as f:
    labels = f.read().splitlines()

def process_image(contents):
    image = Image.open(io.BytesIO(contents)).convert("RGB")
    image = image.resize((224, 224))
    img_array = np.array(image) / 255.0
    return np.expand_dims(img_array, axis=0)

@app.post("/predict/manual")
async def predict_manual(file: UploadFile = File(...)):
    # Digunakan oleh Halaman Scan
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
async def predict_iot(file: UploadFile = File(...)):
    # Digunakan oleh ESP32-CAM untuk Halaman Sensor
    contents = await file.read()
    img_array = process_image(contents)
    predictions = model.predict(img_array)
    index = np.argmax(predictions[0])
    
    return {
        "source": "IoT Device",
        "label": labels[index],
        "confidence": round(float(np.max(predictions[0])) * 100, 2)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)