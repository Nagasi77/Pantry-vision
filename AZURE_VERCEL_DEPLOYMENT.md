# Azure + Vercel + ESP32 Deployment Guide

## Architecture Overview

```
ESP32 Camera
    ↓
Azure Server (Python/TensorFlow)
    ↓
Supabase Database
    ↓
Vercel Web App (reads from Supabase)
```

**Key Points:**
- **ESP32** → sends photos to Azure Server
- **Azure Server** → processes images with AI, writes results to Supabase
- **Supabase** → stores detection history and data
- **Vercel App** → reads data from Supabase ONLY (no direct Azure calls)

---

## 1. Supabase Setup

### Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Get your:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Anon Public Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY` (keep secret!)

### Create Database Table
Run this SQL in Supabase SQL Editor:

```sql
CREATE TABLE detections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_label TEXT NOT NULL,
  display_label TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  suggestion TEXT,
  source TEXT DEFAULT 'IoT',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  image_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE detections ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read
CREATE POLICY "detections_select" ON detections
  FOR SELECT USING (true);

-- Policy: Service role can insert
CREATE POLICY "detections_insert" ON detections
  FOR INSERT WITH CHECK (true);
```

---

## 2. Azure Setup

### Create Azure Function App

```bash
# Install Azure CLI
# https://learn.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Create resource group
az group create --name pantry-vision --location eastus

# Create App Service Plan
az appservice plan create \
  --name pantry-vision-plan \
  --resource-group pantry-vision \
  --sku B1 \
  --is-linux

# Create Web App
az webapp create \
  --resource-group pantry-vision \
  --plan pantry-vision-plan \
  --name pantry-vision-app \
  --runtime "PYTHON|3.11"
```

### Deploy Python Backend

```bash
cd app/api

# Create requirements.txt (already done)
# Install locally for testing:
pip install -r requirements.txt

# Deploy to Azure App Service
az webapp deployment source config-zip \
  --resource-group pantry-vision \
  --name pantry-vision-app \
  --src <path-to-zipped-app>
```

### Set Azure Environment Variables

In Azure Portal → App Service → Configuration → Application settings:

```
NEXT_PUBLIC_SUPABASE_URL          = https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY         = eyJhbGc...
AZURE_SERVER_URL                  = https://pantry-vision-app.azurewebsites.net
GMAIL_USER                        = your@gmail.com
GMAIL_APP_PASSWORD                = xxxx xxxx xxxx xxxx
```

---

## 3. ESP32 Configuration

### Update ESP32 Sketch

Update `firmware/mainESP.ino`:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <Camera.h>

// WiFi credentials
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Azure Server URL (from .env)
const char* azureServerUrl = "https://pantry-vision-app.azurewebsites.net";
const char* predictEndpoint = "/predict/iot";

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("WiFi connected");
  
  // Initialize camera
  initCamera();
}

void loop() {
  // Capture photo
  uint8_t* photoBuffer = capturePhoto();
  
  if (photoBuffer != NULL) {
    // Send to Azure Server
    sendPhotoToAzure(photoBuffer);
    free(photoBuffer);
  }
  
  delay(30000); // Send every 30 seconds
}

void sendPhotoToAzure(uint8_t* photoBuffer) {
  HTTPClient http;
  
  String url = String(azureServerUrl) + String(predictEndpoint);
  http.begin(url);
  http.addHeader("Content-Type", "application/octet-stream");
  
  size_t photoSize = getPhotoSize();
  int httpCode = http.POST(photoBuffer, photoSize);
  
  if (httpCode > 0) {
    Serial.printf("HTTP Response: %d\n", httpCode);
  } else {
    Serial.printf("HTTP Error: %s\n", http.errorToString(httpCode).c_str());
  }
  
  http.end();
}
```

---

## 4. Vercel Deployment

### Environment Variables on Vercel

Go to Vercel Dashboard → Project Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL      = https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc...

NEXTAUTH_SECRET               = (generate: openssl rand -base64 32)
NEXTAUTH_URL                  = https://your-vercel-domain.vercel.app

GOOGLE_CLIENT_ID              = xxxxx
GOOGLE_CLIENT_SECRET          = xxxxx

GITHUB_ID                     = xxxxx
GITHUB_SECRET                 = xxxxx

GMAIL_USER                    = your@gmail.com
GMAIL_APP_PASSWORD            = xxxx xxxx xxxx xxxx

AZURE_SERVER_URL              = https://pantry-vision-app.azurewebsites.net
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

---

## 5. Data Flow Summary

### Manual Scan (via Vercel Web App)
```
User uploads image in Vercel
    ↓
POST /api/ai/predict (Vercel Next.js API)
    ↓
Forward to Azure Server
    ↓
Azure processes with TensorFlow
    ↓
Return result to Vercel
    ↓
Display result to user
```

### IoT Scan (via ESP32)
```
ESP32 captures photo
    ↓
POST to Azure /predict/iot
    ↓
Azure processes image
    ↓
Azure saves to Supabase
    ↓
Vercel reads from Supabase
    ↓
Display latest data in Sensor page
```

---

## 6. Troubleshooting

### Azure server not responding
- Check Azure App Service logs: `az webapp log tail --resource-group pantry-vision --name pantry-vision-app`
- Verify environment variables are set correctly
- Check Python dependencies: `pip install -r requirements.txt`

### Vercel can't reach Azure
- Verify `AZURE_SERVER_URL` is correct and accessible
- Check Azure firewall/CORS settings
- Test with curl: `curl -X GET https://your-azure-app.azurewebsites.net/health`

### Supabase write fails
- Verify `SUPABASE_SERVICE_ROLE_KEY` is correct
- Check that `detections` table exists
- Verify RLS policies allow inserts

### ESP32 won't connect to Azure
- Verify WiFi credentials
- Check that `AZURE_SERVER_URL` matches environment variable
- Add serial debug output to diagnose

---

## 7. Next Steps

- [ ] Create Supabase project and table
- [ ] Deploy Azure Function App
- [ ] Set environment variables on all platforms
- [ ] Update ESP32 firmware and upload
- [ ] Deploy Vercel app
- [ ] Test data flow end-to-end

---

## Primary Flow — Local Hadoop Demo (interactive)

The demo page is now the primary path for showcasing Hadoop processing. It reads synced JSON outputs from the repository folder `hdfs_sync/` and provides lightweight processing and export features so you can demo results without migrating data.

Location:
- Demo page: [app/(dashboard)/hadoop/page.tsx](app/(dashboard)/hadoop/page.tsx#L1)

Implemented / planned features:
- **Summary:** total detections, number of files, average confidence, top labels (quick overview).
- **Recent table:** latest detections with `timestamp`, `display_label`/`raw_label`, `confidence`, and `image_path`.
- **Export:** download aggregated results as CSV/JSON (button will call an API that merges `hdfs_sync/` files).
- **Processing:** basic deduplication by `image_path` and grouping by label (minimal processing for clarity).

Run locally (recommended for demos):

```bash
# 1. Install and start dev server
npm install
npm run dev

# 2. Open demo page
http://localhost:3000/(dashboard)/hadoop
```

Deploy notes (Vercel / production):
- The demo page reads files from the local filesystem and is intended for local/demo use. On Vercel (serverless) the repo filesystem is not suitable for dynamic updates.
- For deploying on Vercel or sharing the demo remotely, either:
  - Upload `hdfs_sync/` data to Azure Blob (or another object storage) and change the demo to read from that storage or an API, or
  - Implement an API route that aggregates JSON from a storage backend (recommended). This keeps the UI identical while making data available in production.

Recommendation: keep the local demo for presentation, and migrate only if you need repeated remote access or integration with the rest of the system.

