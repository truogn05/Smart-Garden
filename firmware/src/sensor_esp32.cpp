#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include "Config.h"
#include "MqttManager.h"

// Hardware pins
#define DHT_PIN 4
#define DHT_TYPE DHT22
#define SOIL_ADC_PIN 32
#define RAIN_ADC_PIN 34
#define RAIN_DIGITAL_PIN 35

// DHT instance
DHT _dht(DHT_PIN, DHT_TYPE);

// Globals
WiFiClient _wifiClient;
MqttManager* _mqtt = nullptr;

uint32_t _lastHeartbeat = 0;
uint32_t _lastSensorRead = 0;

// Forward declarations
void setupWiFi();
void setupMQTT();
void readAndPublishSensors();
void publishHeartbeat();
void callback(char* topic, uint8_t* payload, unsigned int length);

// Averaging buffer for ADC
const int ADC_SAMPLES = 64;
int _soilReadings[ADC_SAMPLES];
int _rainReadings[ADC_SAMPLE];
int _sampleIndex = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== SmartGarden Sensor ESP32 ===");
  Serial.printf("Device Type: %s\n", DEVICE_TYPE);

  // Set device code from MAC address
  char deviceCode[32];
  uint8_t mac[6];
  WiFi.macAddress(mac);
  snprintf(deviceCode, sizeof(deviceCode), "SENSOR_%02X%02X%02X", mac[3], mac[4], mac[5]);

  // Initialize ADC
  analogSetAttenuation(ADC_11db);  // Full range 0-3.3V
  analogRead(SOIL_ADC_PIN);  // First read is often wrong

  // Initialize DHT
  _dht.begin();

  // Initialize averaging buffer
  for (int i = 0; i < ADC_SAMPLES; i++) {
    _soilReadings[i] = 2048;
    _rainReadings[i] = 0;
  }

  // Setup subsystems
  setupWiFi();

  _mqtt = new MqttManager(_wifiClient, deviceCode);
  _mqtt->setCallback(callback);
  setupMQTT();

  // Initial sensor read
  readAndPublishSensors();

  Serial.println("=== Sensor Ready ===");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
    return;
  }

  if (_mqtt) {
    _mqtt->loop();

    uint32_t now = millis();

    // Publish sensor data every 30 seconds
    if (now - _lastSensorRead > 30000) {
      readAndPublishSensors();
      _lastSensorRead = now;
    }

    // Publish heartbeat every 60 seconds
    if (now - _lastHeartbeat > 60000) {
      publishHeartbeat();
      _lastHeartbeat = now;
    }
  }
}

void setupWiFi() {
  Serial.printf("[WIFI] Connecting to %s\n", WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  uint8_t attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WIFI] Connected: %s\n", WiFi.localIP().toString().c_str());
  }
}

void setupMQTT() {
  if (_mqtt) {
    _mqtt->connect();
    Serial.println("[MQTT] Connected");
  }
}

void readAndPublishSensors() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  char topic[64];
  char payload[256];
  uint32_t ts = millis();

  // Read DHT22
  float temp = _dht.readTemperature();
  float humidity = _dht.readHumidity();

  // Read rain sensor (analog)
  int rainRaw = analogRead(RAIN_ADC_PIN);
  _rainReadings[_sampleIndex] = rainRaw;

  // Read soil moisture (analog, average 64 samples)
  int soilRaw = analogRead(SOIL_ADC_PIN);
  _soilReadings[_sampleIndex] = soilRaw;

  // Update circular buffer index
  _sampleIndex = (_sampleIndex + 1) % ADC_SAMPLES;

  // Calculate averages
  long soilSum = 0;
  long rainSum = 0;
  for (int i = 0; i < ADC_SAMPLES; i++) {
    soilSum += _soilReadings[i];
    rainSum += _rainReadings[i];
  }
  int soilAvg = soilSum / ADC_SAMPLES;
  int rainAvg = rainSum / ADC_SAMPLES;

  // Convert to percentage (calibrate based on your sensors)
  int moisturePct = map(soilAvg, 0, 4095, 100, 0);
  moisturePct = constrain(moisturePct, 0, 100);

  // Rain detection (digital pin)
  bool isRaining = digitalRead(RAIN_DIGITAL_PIN) == LOW;
  int rainIntensity = rainAvg > 3000 ? 2 : (rainAvg > 1500 ? 1 : 0);

  // Publish weather data
  snprintf(topic, sizeof(topic), "%s/%s/sensor/weather", TOPIC_BASE, _mqtt->getDeviceCode());
  snprintf(payload, sizeof(payload),
    "{\"temp\":%.1f,\"humidity\":%.1f,\"is_raining\":%s,\"rain_intensity\":%d,\"ts\":%lu}",
    isnan(temp) ? 0 : temp,
    isnan(humidity) ? 0 : humidity,
    isRaining ? "true" : "false",
    rainIntensity,
    ts);
  _mqtt->publish(topic, payload, false);
  Serial.printf("[MQTT] Weather: %s\n", payload);

  // Publish soil data
  snprintf(topic, sizeof(topic), "%s/%s/sensor/soil", TOPIC_BASE, _mqtt->getDeviceCode());
  snprintf(payload, sizeof(payload),
    "{\"moisture_raw\":%d,\"moisture_pct\":%d,\"ts\":%lu}",
    soilAvg, moisturePct, ts);
  _mqtt->publish(topic, payload, false);
  Serial.printf("[MQTT] Soil: %s\n", payload);
}

void publishHeartbeat() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  char topic[64];
  char payload[256];

  snprintf(topic, sizeof(topic), "%s/%s/device/heartbeat", TOPIC_BASE, _mqtt->getDeviceCode());
  snprintf(payload, sizeof(payload),
    "{\"uptime_sec\":%lu,\"rssi\":%d,\"free_heap\":%lu}",
    millis() / 1000,
    WiFi.RSSI(),
    ESP.getFreeHeap());

  _mqtt->publish(topic, payload, false);
  Serial.printf("[MQTT] Heartbeat: %s\n", payload);
}

void callback(char* topic, uint8_t* payload, unsigned int length) {
  // Sensor doesn't respond to any commands currently
  (void)topic;
  (void)payload;
  (void)length;
}