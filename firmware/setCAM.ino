#include "esp_camera.h"
#include <WiFi.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

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

const char* ssid         = "Redmin";
const char* password     = "11111111";
const char* mqtt_server  = "broker.hivemq.com";
const char* laptop_ip    = "172.27.232.205"; 
const int   fastapi_port = 8000;

WiFiClient espClient;
PubSubClient client(espClient);
bool kameraOK = false;

bool kirimFoto(camera_fb_t* fb) {
  if (WiFi.status() != WL_CONNECTED) return false;

  String boundary = "ESP32Boundary123";
  String header = "--" + boundary + "\r\n"
                  "Content-Disposition: form-data; "
                  "name=\"file\"; filename=\"pantry.jpg\"\r\n"
                  "Content-Type: image/jpeg\r\n\r\n";
  String footer = "\r\n--" + boundary + "--\r\n";

  size_t totalLen = header.length() + fb->len + footer.length();
  uint8_t* body = (uint8_t*)malloc(totalLen);
  if (!body) return false;

  memcpy(body, header.c_str(), header.length());
  memcpy(body + header.length(), fb->buf, fb->len);
  memcpy(body + header.length() + fb->len, footer.c_str(), footer.length());

  HTTPClient http;
  String url = "http://" + String(laptop_ip) + ":" + String(fastapi_port) + "/predict/iot";

  http.begin(url);
  http.setTimeout(10000);
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

  int code = http.POST(body, totalLen);
  free(body);
  http.end();

  if (code == 200) {
    client.publish("pantry/status", "FOTO_OK");
    return true;
  } else {
    client.publish("pantry/status", "FOTO_GAGAL");
    return false;
  }
}

void jalankanAmbilFoto() {
  if (!kameraOK) return;
  camera_fb_t* fb = esp_camera_fb_get();
  if (fb) {
    kirimFoto(fb);
    esp_camera_fb_return(fb);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  if (String(topic) == "pantry/cam" && message == "AMBIL_FOTO") {
    Serial.println("[MQTT] Perintah AMBIL_FOTO diterima!");
    jalankanAmbilFoto();
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT...");
    if (client.connect("ESP32CAM_Pantry")) {
      client.subscribe("pantry/cam");
      Serial.println("Terhubung!");
    } else {
      delay(5000);
    }
  }
}

bool initCamera() {
  camera_config_t config;
  config.ledc_channel  = LEDC_CHANNEL_0;
  config.ledc_timer    = LEDC_TIMER_0;
  config.pin_d0        = Y2_GPIO_NUM;
  config.pin_d1        = Y3_GPIO_NUM;
  config.pin_d2        = Y4_GPIO_NUM;
  config.pin_d3        = Y5_GPIO_NUM;
  config.pin_d4        = Y6_GPIO_NUM;
  config.pin_d5        = Y7_GPIO_NUM;
  config.pin_d6        = Y8_GPIO_NUM;
  config.pin_d7        = Y9_GPIO_NUM;
  config.pin_xclk      = XCLK_GPIO_NUM;
  config.pin_pclk      = PCLK_GPIO_NUM;
  config.pin_vsync     = VSYNC_GPIO_NUM;
  config.pin_href      = HREF_GPIO_NUM;
  config.pin_sscb_sda  = SIOD_GPIO_NUM;
  config.pin_sscb_scl  = SIOC_GPIO_NUM;
  config.pin_pwdn      = PWDN_GPIO_NUM;
  config.pin_reset     = RESET_GPIO_NUM;
  config.xclk_freq_hz  = 20000000;
  config.pixel_format  = PIXFORMAT_JPEG;
  config.frame_size    = FRAMESIZE_QVGA;
  config.jpeg_quality  = 12;
  config.fb_count      = 1;

  esp_err_t err = esp_camera_init(&config);
  if (err == ESP_OK) {
    sensor_t * s = esp_camera_sensor_get();
    s->set_vflip(s, 1);
    s->set_hmirror(s, 1);
    Serial.println("[OK] Kamera berhasil!");
    return true;
  }
  return false;
}

void setup() {
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  Serial.begin(115200);
  delay(500);

  kameraOK = initCamera();

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi Connected!");

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) reconnect();
  client.loop();
}