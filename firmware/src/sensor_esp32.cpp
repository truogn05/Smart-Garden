#include <Arduino.h>
#include <DHT.h>
#include <functional>
#include <ArduinoJson.h>
#include "Config.h"
#include "MqttManager.h"
#include "WifiProvisioner.h"
#include "DryoutPredictor.h"

// ── Forward declarations ─────────────────────────────────────────────────────────
void readAndPublishSensors();
void predictAndPublishDryout();
void publishHeartbeat();

// ── Hardware ───────────────────────────────────────────────────────────────────
DHT _dht(DHT_PIN, DHT_TYPE);

// ── Globals ────────────────────────────────────────────────────────────────────
WifiProvisioner _wifi;
MqttManager* _mqtt = nullptr;
DryoutPredictor _predictor;

uint32_t _lastSensorRead = 0;
uint32_t _lastHeartbeat = 0;
uint32_t _lastDryoutPredict = 0;
uint32_t _lastWateringTime = 0;  // millis() when pump last ran

// ADC averaging buffers
int _soilReadings[ADC_SAMPLES] = {0};
int _rainReadings[ADC_SAMPLES] = {0};
uint8_t _sampleIndex = 0;

// Current sensor values (latest readings)
float _currentTemp = 0;
float _currentHumidity = 0;
float _currentSoilPct = 0;
float _currentRainIntensity = 0;

// ── Helpers ────────────────────────────────────────────────────────────────────
inline int avgArray(int* arr, size_t len) {
  long sum = 0;
  for (size_t i = 0; i < len; i++) sum += arr[i];
  return sum / len;
}

float timeOfDayNormalized() {
  // 0.0 = midnight, 0.5 = noon, 1.0 = midnight
  return (float)(millis() / 1000 % 86400) / 86400.0f;
}

// ── Setup ──────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(800);

  Serial.println("\n=== SmartGarden Sensor ===");
  Serial.printf("Device: %s\n", DEVICE_CODE);

  // Initialize ADC (full range 0-3.3V for ESP32)
  analogSetAttenuation(ADC_11db);
  analogRead(SOIL_ADC_PIN);  // discard first read

  // Initialize DHT
  _dht.begin();

  // Seed averaging buffers
  for (int i = 0; i < ADC_SAMPLES; i++) _soilReadings[i] = 2048;

  // Load AI model from flash (or use defaults)
  _predictor.loadFromFlash();

  // WiFi: load stored credentials or enter AP mode
  if (!_wifi.begin()) {
    Serial.println("[WiFi] AP mode active — visit /reset page to provision");
  }

  // MQTT
  _mqtt = new MqttManager(DEVICE_CODE);
  _mqtt->setCallback([](char* topic, uint8_t* payload, unsigned int length) {
    payload[length] = '\0';
    Serial.printf("[MQTT] Rx: %s → %s\n", topic, (char*)payload);

    // Handle remote WiFi reset command
    char expectedTopic[64];
    snprintf(expectedTopic, sizeof(expectedTopic), TOPIC_RESET_COMMAND, DEVICE_CODE);
    if (strncmp(topic, expectedTopic, strlen(expectedTopic)) == 0) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, payload) == DeserializationError::Ok) {
        if (strcmp(doc["action"], "clear_wifi") == 0) {
          Serial.println("[MQTT] Reset command received — clearing WiFi");
          _wifi.clearCredentials();
          delay(300);
          ESP.restart();
        }
      }
    }

    // Handle pump status to record last watering time
    if (strstr(topic, "pump/status") != nullptr) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, payload) == DeserializationError::Ok) {
        bool running = doc["running"] | false;
        if (running) {
          _lastWateringTime = millis();
          Serial.println("[Sensor] Pump started — recording watering time");
        }
      }
    }
  });
  _mqtt->connect();

  // Initial reads
  readAndPublishSensors();
  predictAndPublishDryout();

  Serial.println("=== Sensor Ready ===");
}

// ── Main loop ──────────────────────────────────────────────────────────────────
void loop() {
  // AP mode: serve web pages
  if (_wifi.isProvisioning()) {
    _wifi.handleProvisioning();
    return;
  }

  // WiFi down: skip to next iteration
  if (!_wifi.isConnected()) return;

  // MQTT keepalive
  _mqtt->loop();

  uint32_t now = millis();

  if (now - _lastSensorRead >= SENSOR_READ_INTERVAL_MS) {
    readAndPublishSensors();
    _lastSensorRead = now;
  }

  if (now - _lastDryoutPredict >= DRYOUT_PREDICT_INTERVAL_MS) {
    predictAndPublishDryout();
    _lastDryoutPredict = now;
  }

  if (now - _lastHeartbeat >= HEARTBEAT_INTERVAL_MS) {
    publishHeartbeat();
    _lastHeartbeat = now;
  }

  // Periodic AI model save (every ~10 min)
  static uint32_t _lastAiSave = 0;
  if (now - _lastAiSave > 600000) {
    _predictor.saveToFlash();
    _lastAiSave = now;
  }
}

// ── Sensor reading ─────────────────────────────────────────────────────────────
void readAndPublishSensors() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  uint32_t ts = millis();

  // DHT22
  float temp = _dht.readTemperature();
  float humidity = _dht.readHumidity();
  if (isnan(temp)) temp = 0;
  if (isnan(humidity)) humidity = 0;
  _currentTemp = temp;
  _currentHumidity = humidity;

  // Soil ADC
  int soilRaw = analogRead(SOIL_ADC_PIN);
  _soilReadings[_sampleIndex] = soilRaw;
  int soilAvg = avgArray(_soilReadings, ADC_SAMPLES);
  float soilPct = map(soilAvg, 0, ADC_MAX, 100, 0);
  soilPct = constrain(soilPct, 0, 100);
  _currentSoilPct = soilPct;

  // Rain ADC
  int rainRaw = analogRead(RAIN_ADC_PIN);
  _rainReadings[_sampleIndex] = rainRaw;
  int rainAvg = avgArray(_rainReadings, ADC_SAMPLES);
  _currentRainIntensity = rainAvg > 3000 ? 2 : (rainAvg > 1500 ? 1 : 0);

  _sampleIndex = (_sampleIndex + 1) % ADC_SAMPLES;

  // Publish weather
  char topic[64], payload[256];
  snprintf(topic, sizeof(topic), TOPIC_WEATHER, DEVICE_CODE);
  snprintf(payload, sizeof(payload),
    "{\"temp\":%.1f,\"humidity\":%.1f,\"rain\":%d,\"ts\":%lu}",
    temp, humidity, _currentRainIntensity, ts);
  _mqtt->publish(topic, payload);
  Serial.printf("[MQTT] Weather: %s\n", payload);

  // Publish soil
  snprintf(topic, sizeof(topic), TOPIC_SOIL, DEVICE_CODE);
  snprintf(payload, sizeof(payload),
    "{\"moisture\":%d,\"ts\":%lu}", (int)soilPct, ts);
  _mqtt->publish(topic, payload);
  Serial.printf("[MQTT] Soil: %s\n", payload);
}

// ── AI dry-out prediction ──────────────────────────────────────────────────────
void predictAndPublishDryout() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  uint32_t now = millis();
  float lastDuration = (now - _lastWateringTime) / 1000.0f;  // seconds → scaled

  float hours = _predictor.predict(
    _currentSoilPct,
    _currentTemp,
    _currentHumidity,
    _currentRainIntensity,
    timeOfDayNormalized(),
    lastDuration / 60.0f  // minutes
  );

  // Simple confidence: based on how many samples learned (use prediction variance proxy)
  float confidence = 0.75f;  // TODO: track sample count for real confidence

  char topic[64], payload[256];
  snprintf(topic, sizeof(topic), TOPIC_AI_DRYOUT, DEVICE_CODE);
  snprintf(payload, sizeof(payload),
    "{\"hours\":%.1f,\"confidence\":%.2f,\"ts\":%lu}",
    hours, confidence, now);
  _mqtt->publish(topic, payload);
  Serial.printf("[AI] Dryout: %.1f hrs (conf=%.2f)\n", hours, confidence);

  // Decision logic: auto-water if predicted dry in <6h
  if (hours < 6.0f && _currentSoilPct < 30) {
    Serial.printf("[AI] Warning: soil will be dry in %.1f hours!\n", hours);
  }
}

// ── Heartbeat ──────────────────────────────────────────────────────────────────
void publishHeartbeat() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  char topic[64], payload[256];
  snprintf(topic, sizeof(topic), TOPIC_HEARTBEAT, DEVICE_CODE);
  snprintf(payload, sizeof(payload),
    "{\"uptime\":%lu,\"rssi\":%d,\"free_heap\":%lu}",
    millis() / 1000, WiFi.RSSI(), ESP.getFreeHeap());

  _mqtt->publish(topic, payload);
  Serial.printf("[MQTT] Heartbeat: %s\n", payload);
}