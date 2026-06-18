/*
 * ESP32-CAM Pantry Vision
 * Kirim foto ke Azure App Service via HTTPS POST
 *
 * Board   : AI Thinker ESP32-CAM
 * Library : PubSubClient, ESP32 Arduino Core
 * Server  : https://pantry-vision-app-2026-eqbvdnfwhwf8cqhc.indonesiacentral-01.azurewebsites.net/predict/iot
 *
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ── Pin Map (AI Thinker ESP32-CAM) ──────────────────────────────────────────
#define FLASH_GPIO_NUM     4
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// ── Konfigurasi ──────────────────────────────────────────────────────────────
const char* ssid        = "Redmin";
const char* password    = "11111111";
const char* mqtt_server = "broker.hivemq.com";
const int   mqtt_port   = 1883;

// ✅ FIX: URL Azure (HTTPS) — ganti dari IP lokal laptop
const char* azureServerUrl = "https://pantry-vision-app-2026-eqbvdnfwhwf8cqhc.indonesiacentral-01.azurewebsites.net/predict/iot";
// ── Globals ──────────────────────────────────────────────────────────────────
WiFiClient   espClient;
PubSubClient mqttClient(espClient);
bool         kameraOK = false;

// ── Fungsi: Kirim Foto ke Azure ──────────────────────────────────────────────
bool kirimFoto(camera_fb_t* fb) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] WiFi tidak terhubung, batal kirim.");
    return false;
  }

  const String boundary = "ESP32Boundary123";
  const String CRLF     = "\r\n";

  String header =
    "--" + boundary + CRLF +
    "Content-Disposition: form-data; name=\"file\"; filename=\"pantry.jpg\"" + CRLF +
    "Content-Type: image/jpeg" + CRLF + CRLF;

  String footer = CRLF + "--" + boundary + "--" + CRLF;

  size_t   totalLen = header.length() + fb->len + footer.length();
  uint8_t* body     = (uint8_t*)ps_malloc(totalLen);

  if (!body) {
    Serial.println("[HTTP] malloc gagal!");
    return false;
  }

  memcpy(body,                              header.c_str(), header.length());
  memcpy(body + header.length(),            fb->buf,        fb->len);
  memcpy(body + header.length() + fb->len, footer.c_str(), footer.length());

  // ✅ FIX: pakai WiFiClientSecure untuk HTTPS ke Azure
  WiFiClientSecure secureClient;
  secureClient.setInsecure(); // skip cert verification — cukup untuk IoT

  HTTPClient http;
  http.begin(secureClient, azureServerUrl);
  http.setTimeout(15000); // ✅ FIX: 15 detik — Azure cold start lebih lambat dari lokal
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  int httpCode = http.POST(body, totalLen);
  free(body);

  String response = http.getString();
  http.end();

  Serial.printf("[HTTP] Response code: %d\n", httpCode);
  if (response.length() > 0) {
    Serial.println("[HTTP] Body: " + response.substring(0, 200)); // potong kalau panjang
  }

  if (httpCode == 200 || httpCode == 201) {
    mqttClient.publish("pantry/status", "FOTO_OK");
    return true;
  } else {
    String errMsg = "FOTO_GAGAL:" + String(httpCode);
    mqttClient.publish("pantry/status", errMsg.c_str());
    return false;
  }
}

// ── Fungsi: Ambil Foto dari Kamera ───────────────────────────────────────────
void jalankanAmbilFoto() {
  if (!kameraOK) {
    Serial.println("[CAM] Kamera tidak siap.");
    return;
  }

  analogWrite(FLASH_GPIO_NUM, 26); // 10% brightness

  // Buang frame lama
  camera_fb_t* dummy = esp_camera_fb_get();
  if (dummy) esp_camera_fb_return(dummy);

  delay(800);

  camera_fb_t* fb = esp_camera_fb_get();

  delay(100);
  analogWrite(FLASH_GPIO_NUM, 0);

  if (!fb) {
    Serial.println("[CAM] Gagal ambil frame!");
    mqttClient.publish("pantry/status", "CAM_ERROR");
    return;
  }

  Serial.printf("[CAM] Frame OK (%u bytes), mulai kirim ke Azure...\n", fb->len);
  kirimFoto(fb);
  esp_camera_fb_return(fb);
}

// ── MQTT Callback ─────────────────────────────────────────────────────────────
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  Serial.printf("[MQTT] Topik: %s | Pesan: %s\n", topic, message.c_str());

  if (String(topic) == "pantry/cam" && message == "AMBIL_FOTO") {
    Serial.println("[MQTT] Perintah AMBIL_FOTO diterima!");
    jalankanAmbilFoto();
  }
}

// ── MQTT Reconnect ────────────────────────────────────────────────────────────
void reconnect() {
  int attempt = 0;
  while (!mqttClient.connected() && attempt < 5) {
    attempt++;
    Serial.printf("[MQTT] Menghubungkan... (percobaan %d)\n", attempt);

    if (mqttClient.connect("ESP32CAM_Pantry")) {
      mqttClient.subscribe("pantry/cam");
      Serial.println("[MQTT] Terhubung! Subscribed ke pantry/cam");
    } else {
      Serial.printf("[MQTT] Gagal, rc=%d. Coba lagi 5 detik...\n", mqttClient.state());
      delay(5000);
    }
  }
}

// ── Init Kamera ───────────────────────────────────────────────────────────────
bool initCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  config.frame_size   = FRAMESIZE_QVGA; // 320x240
  config.jpeg_quality = 12;
  config.fb_count     = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[CAM] Init gagal: 0x%x\n", err);
    return false;
  }

  sensor_t* s = esp_camera_sensor_get();
  s->set_vflip(s, 1);
  s->set_hmirror(s, 1);

  Serial.println("[CAM] Kamera berhasil diinisialisasi!");
  return true;
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(500);
  Serial.println("\n[BOOT] ESP32-CAM Pantry Vision starting...");

  pinMode(FLASH_GPIO_NUM, OUTPUT);
  analogWrite(FLASH_GPIO_NUM, 0);

  kameraOK = initCamera();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("[WiFi] Menghubungkan");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());

  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(callback);
  mqttClient.setBufferSize(512);

  Serial.println("[BOOT] Siap! Menunggu perintah MQTT di pantry/cam...");
  Serial.printf("[BOOT] Azure endpoint: %s\n", azureServerUrl);
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  if (!mqttClient.connected()) {
    reconnect();
  }
  mqttClient.loop();

  static unsigned long lastHeartbeat = 0;
  if (millis() - lastHeartbeat > 30000UL) {
    lastHeartbeat = millis();
    if (mqttClient.connected()) {
      mqttClient.publish("pantry/status", "ALIVE");
    }
  }
}
