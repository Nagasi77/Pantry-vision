#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

const char* ssid        = "Redmin";
const char* password    = "11111111";
const char* mqtt_server = "broker.hivemq.com";

const int TRIG_PIN   = 5;
const int ECHO_PIN   = 18;
const int GAS_PIN    = 34;
const int LED_HIJAU  = 27;
const int LED_KUNING = 26;
const int LED_MERAH  = 25;

WiFiClient   espClient;
PubSubClient client(espClient);
bool         sudahFoto   = false;
String       statusModel = "Menunggu...";
unsigned long lastMsgTime = 0;

Adafruit_SSD1306 display(128, 64, &Wire, -1);

void setup_wifi() {
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println("Mencari WiFi...");
  display.display();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    display.print(".");
    display.display();
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.println("WiFi Terhubung!");
  display.display();
  delay(1000);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }

  if (String(topic) == "pantry/perintah") {
    if (message == "AMBIL_FOTO") {
      client.publish("pantry/cam", "AMBIL_FOTO"); 
      Serial.println("[MQTT] Perintah manual diteruskan ke ESP32-CAM");
    }
  }

  if (String(topic) == "pantry/kondisi") {
    statusModel = message;
    if (message == "SEGAR") {
      digitalWrite(LED_HIJAU,  HIGH);
      digitalWrite(LED_KUNING, LOW);
      digitalWrite(LED_MERAH,  LOW);
    } else if (message == "WASPADA") {
      digitalWrite(LED_HIJAU,  LOW);
      digitalWrite(LED_KUNING, HIGH);
      digitalWrite(LED_MERAH,  LOW);
    } else if (message == "BUSUK") {
      digitalWrite(LED_HIJAU,  LOW);
      digitalWrite(LED_KUNING, LOW);
      digitalWrite(LED_MERAH,  HIGH);
    }
  }
}

void reconnect() {
  while (!client.connected()) {
    display.clearDisplay();
    display.setCursor(0, 0);
    display.println("Konek MQTT...");
    display.display();

    if (client.connect("ESP32PantryMain")) {
      client.subscribe("pantry/perintah");
      client.subscribe("pantry/kondisi");
      display.println("MQTT Connected!");
      display.display();
      delay(1000);
    } else {
      display.println("MQTT Gagal...");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);

  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  pinMode(TRIG_PIN,   OUTPUT);
  pinMode(ECHO_PIN,   INPUT);
  pinMode(LED_HIJAU,  OUTPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_MERAH,  OUTPUT);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long  durasi   = pulseIn(ECHO_PIN, HIGH);
  float jarak    = durasi * 0.034 / 2;
  int   nilaiGas = analogRead(GAS_PIN);

  if (jarak < 8 && jarak > 0) {
    if (!sudahFoto) {
      client.publish("pantry/cam", "AMBIL_FOTO");
      sudahFoto = true;
      client.publish("pantry/status", "Ada Objek - Trigger Dikirim");
      Serial.println("[INFO] Objek terdeteksi - Trigger MQTT dikirim ke ESP32-CAM");
    }
  } else {
    sudahFoto  = false;
    statusModel = "Kosong";
    digitalWrite(LED_HIJAU,  LOW);
    digitalWrite(LED_KUNING, LOW);
    digitalWrite(LED_MERAH,  LOW);
  }

  unsigned long now = millis();
  if (now - lastMsgTime > 3000) {
    lastMsgTime = now;
    String jsonKirim = "{\"jarak\":" + String(jarak) + ",\"gas\":" + String(nilaiGas) + "}";
    client.publish("pantry/sensors", jsonKirim.c_str());
  }

  display.clearDisplay();
  display.setCursor(0, 0);
  display.print("Jarak: ");
  display.print(jarak, 1);
  display.println(" cm");
  display.print("Gas: ");
  display.println(nilaiGas);
  display.print("Status: ");
  display.println(statusModel);
  display.display();

  delay(100); 
}