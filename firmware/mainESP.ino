/*
 * ESP32 Main — Pantry Vision
 * Sensor ultrasonic + gas, OLED display, LED indikator, MQTT
 *
 * Board   : ESP32 DevKit / WROOM
 * Library : PubSubClient, Adafruit SSD1306, Adafruit GFX
 *
 * PERUBAHAN dari versi sebelumnya:
 *   1. Anti-spam: debounce + hysteresis + cooldown
 *   2. isPaused dikendalikan dari dashboard via MQTT (PAUSE/RESUME)
 *   3. Kirim field "paused" di JSON sensor
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ── Konfigurasi ───────────────────────────────────────────────────────────────
const char* ssid        = "Redmin";
const char* password    = "11111111";
const char* mqtt_server = "broker.hivemq.com";
const int   mqtt_port   = 1883;  // ESP32 ke broker: TCP biasa, bukan browser → 1883 aman

// ── Pin Map ───────────────────────────────────────────────────────────────────
const int TRIG_PIN   = 5;
const int ECHO_PIN   = 18;
const int GAS_PIN    = 34;
const int LED_HIJAU  = 27;
const int LED_KUNING = 26;
const int LED_MERAH  = 25;

// ── Konstanta Anti-Spam ───────────────────────────────────────────────────────
const float        JARAK_MASUK    = 6.0;   // cm — threshold objek terdeteksi
const float        JARAK_KELUAR   = 10.0;  // cm — hysteresis reset
const int          DEBOUNCE_COUNT = 5;     // N pembacaan berturut-turut sebelum trigger
const unsigned long COOLDOWN_MS   = 15000; // ms — jeda minimal antar scan

// ── Globals ───────────────────────────────────────────────────────────────────
WiFiClient   espClient;
PubSubClient mqttClient(espClient);

bool          sudahFoto       = false;
bool          isPaused        = false;
String        statusModel     = "Menunggu...";
unsigned long lastSensorTime  = 0;
unsigned long lastTriggerTime = 0;
int           debounceCount   = 0;

Adafruit_SSD1306 display(128, 64, &Wire, -1);

// ── Set LED ───────────────────────────────────────────────────────────────────
void setLED(String status) {
  digitalWrite(LED_HIJAU,  status == "SEGAR"   ? HIGH : LOW);
  digitalWrite(LED_KUNING, status == "WASPADA" ? HIGH : LOW);
  digitalWrite(LED_MERAH,  status == "BUSUK"   ? HIGH : LOW);
}

// ── Update OLED ───────────────────────────────────────────────────────────────
void updateOLED(float jarak, int gas, String status) {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.print("Jarak : ");
  display.print(jarak, 1);
  display.println(" cm");

  display.print("Gas   : ");
  display.println(gas);

  display.println("----------------");

  display.print("Status: ");
  display.println(isPaused ? "DIJEDA" : status);

  display.setCursor(0, 56);
  display.print(mqttClient.connected() ? "MQTT: OK" : "MQTT: --");
  if (isPaused) display.print(" | PAUSE");

  display.display();
}

// ── MQTT Callback ─────────────────────────────────────────────────────────────
void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.printf("[MQTT] Topik: %s | Pesan: %s\n", topic, message.c_str());

  if (String(topic) == "pantry/perintah") {
    if (message == "AMBIL_FOTO") {
      // Perintah manual dari dashboard — selalu dijalankan, reset pause & cooldown
      isPaused      = false;
      sudahFoto     = false;
      debounceCount = 0;
      mqttClient.publish("pantry/cam", "AMBIL_FOTO");
      lastTriggerTime = millis();
      Serial.println("[MQTT] Perintah manual → diteruskan ke ESP32-CAM");

    } else if (message == "PAUSE") {
      isPaused = true;
      Serial.println("[MQTT] Kamera dijeda dari dashboard");

    } else if (message == "RESUME") {
      isPaused      = false;
      sudahFoto     = false;
      debounceCount = 0;
      Serial.println("[MQTT] Kamera dilanjutkan dari dashboard");
    }
  }

  if (String(topic) == "pantry/kondisi") {
    statusModel = message;
    setLED(statusModel);
    Serial.printf("[KONDISI] Status baru: %s\n", statusModel.c_str());
  }
}

// ── MQTT Reconnect ────────────────────────────────────────────────────────────
void reconnect() {
  int attempt = 0;
  while (!mqttClient.connected() && attempt < 5) {
    attempt++;
    Serial.printf("[MQTT] Menghubungkan... (percobaan %d)\n", attempt);

    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Konek MQTT...");
    display.printf("Percobaan %d/5", attempt);
    display.display();

    if (mqttClient.connect("ESP32PantryMain")) {
      mqttClient.subscribe("pantry/perintah");
      mqttClient.subscribe("pantry/kondisi");
      Serial.println("[MQTT] Terhubung!");
      display.clearDisplay();
      display.setCursor(0, 0);
      display.println("MQTT Connected!");
      display.display();
      delay(800);
    } else {
      Serial.printf("[MQTT] Gagal, rc=%d. Coba lagi 5 detik...\n", mqttClient.state());
      display.clearDisplay();
      display.setCursor(0, 0);
      display.printf("MQTT Gagal rc=%d", mqttClient.state());
      display.display();
      delay(5000);
    }
  }
}

// ── Setup WiFi ────────────────────────────────────────────────────────────────
void setup_wifi() {
  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("Mencari WiFi...");
  display.println(ssid);
  display.display();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    display.print(".");
    display.display();
    timeout++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WiFi] Terhubung! IP: %s\n", WiFi.localIP().toString().c_str());
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi Terhubung!");
    display.println(WiFi.localIP().toString());
    display.display();
    delay(1000);
  } else {
    Serial.println("[WiFi] Gagal! Restart...");
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("WiFi GAGAL!");
    display.println("Restarting...");
    display.display();
    delay(2000);
    ESP.restart();
  }
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n[BOOT] ESP32 Main Pantry starting...");

  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Pantry Vision");
  display.println("Booting...");
  display.display();
  delay(500);

  pinMode(TRIG_PIN,   OUTPUT);
  pinMode(ECHO_PIN,   INPUT);
  pinMode(GAS_PIN,    INPUT);
  pinMode(LED_HIJAU,  OUTPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_MERAH,  OUTPUT);
  setLED("");

  setup_wifi();

  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(callback);
  mqttClient.setBufferSize(512);
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  if (!mqttClient.connected()) reconnect();
  mqttClient.loop();

  // Baca HC-SR04
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  long  durasi = pulseIn(ECHO_PIN, HIGH, 30000);
  float jarak  = (durasi == 0) ? 999.0 : (durasi * 0.034 / 2.0);

  // Baca MQ-135
  int nilaiGas = analogRead(GAS_PIN);

  unsigned long now = millis();

  // ── Logika trigger kamera (anti-spam) ──────────────────────────────────────
  if (!isPaused) {
    if (jarak > 0 && jarak < JARAK_MASUK) {
      if (!sudahFoto) {
        debounceCount++;
        if (debounceCount >= DEBOUNCE_COUNT) {
          if (now - lastTriggerTime >= COOLDOWN_MS) {
            mqttClient.publish("pantry/cam", "AMBIL_FOTO");
            sudahFoto       = true;
            lastTriggerTime = now;
            debounceCount   = 0;
            Serial.println("[INFO] Objek terdeteksi → trigger ke ESP32-CAM");
          } else {
            Serial.printf("[INFO] Cooldown aktif, sisa %lu detik\n",
              (COOLDOWN_MS - (now - lastTriggerTime)) / 1000);
          }
        }
      }
    } else if (jarak >= JARAK_KELUAR) {
      if (sudahFoto) {
        sudahFoto     = false;
        debounceCount = 0;
        statusModel   = "Menunggu...";
        setLED("");
        Serial.println("[INFO] Objek menjauh → reset, siap scan lagi");
      } else {
        debounceCount = 0;
      }
    }
    // Zona 6–10cm: diam, tidak trigger tidak reset
  }

  // ── Kirim data sensor setiap 3 detik ───────────────────────────────────────
  if (now - lastSensorTime > 3000) {
    lastSensorTime = now;
    String json = "{\"jarak\":"   + String(jarak, 1) +
                  ",\"gas\":"     + String(nilaiGas) +
                  ",\"status\":\"" + statusModel + "\"" +
                  ",\"paused\":"  + String(isPaused ? "true" : "false") + "}";
    mqttClient.publish("pantry/sensors", json.c_str());
    Serial.printf("[SENSOR] %s\n", json.c_str());
  }
  updateOLED(jarak, nilaiGas, statusModel);
  delay(100);
}
