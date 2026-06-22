#include <Arduino.h>
#include <ArduinoJson.h>
#include <functional>
#include "Config.h"
#include "MqttManager.h"
#include "WifiProvisioner.h"
#include "EspNowManager.h"

// ── Hardware ───────────────────────────────────────────────────────────────────
// RELAY_PIN defined in Config.h

// ── Globals ────────────────────────────────────────────────────────────────────
WifiProvisioner _wifi("pump");
MqttManager* _mqtt = nullptr;
EspNowManager _espnow;

bool _pumpRunning = false;
uint32_t _pumpStartTime = 0;
uint32_t _pumpDuration = 0;
char _currentCmdId[32] = {0};

// ── Forward declarations ───────────────────────────────────────────────────────
void publishStatus();
void sendAck(const char* cmdId);

// ── Setup ──────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  delay(800);

  Serial.println("\n=== SmartGarden Pump ===");
  Serial.printf("Device: %s\n", DEVICE_CODE);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);  // OFF (active LOW)

  if (!_wifi.begin()) {
    Serial.println("[WiFi] AP mode active — visit /reset page to provision");
  }

  _espnow.begin(true);
  _espnow.onCredentialsReceived([](const char* ssid, const char* password) {
    Serial.printf("[ESPNOW] Sensor received WiFi: SSID=%s\n", ssid);
  });

  _mqtt = new MqttManager(DEVICE_CODE);
  String mqttHost = _wifi.getMqttHost();
  if (mqttHost.length() > 0) {
    _mqtt->setServer(mqttHost.c_str(), MQTT_PORT);
  }
  _mqtt->setCallback([](char* topic, uint8_t* payload, unsigned int length) {
    payload[length] = '\0';
    Serial.printf("[MQTT] Rx: %s → %s\n", topic, (char*)payload);

    // ── Pump command ─────────────────────────────────────────────────────────
    if (strstr(topic, "/pump/command") != nullptr) {
      StaticJsonDocument<256> doc;
      if (deserializeJson(doc, payload) != DeserializationError::Ok) {
        Serial.println("[PUMP] Malformed JSON — ignored");
        return;
      }

      const char* action = doc["action"];
      if (!action) return;

      if (strcmp(action, "start") == 0) {
        int duration = doc["duration"] | 90;
        const char* cmdId = doc["cmd_id"] | "";
        if (cmdId[0]) strncpy(_currentCmdId, cmdId, sizeof(_currentCmdId) - 1);

        digitalWrite(RELAY_PIN, LOW);
        _pumpRunning = true;
        _pumpDuration = duration;
        _pumpStartTime = millis();
        Serial.printf("[PUMP] Start %us (cmdId=%s)\n", duration, _currentCmdId);
        sendAck(_currentCmdId);
      }
      else if (strcmp(action, "stop") == 0) {
        digitalWrite(RELAY_PIN, HIGH);
        _pumpRunning = false;
        Serial.println("[PUMP] Stopped");
        publishStatus();
      }
    }

    // ── Remote WiFi reset ────────────────────────────────────────────────────
    if (strstr(topic, "/reset/command") != nullptr) {
      StaticJsonDocument<128> doc;
      if (deserializeJson(doc, payload) == DeserializationError::Ok) {
        if (strcmp(doc["action"], "clear_wifi") == 0) {
          Serial.println("[PUMP] Reset command — clearing WiFi, rebooting");
          _wifi.clearCredentials();
          delay(500);
          ESP.restart();
        }
      }
    }
  });

  _mqtt->connect();

  char commandTopic[64];
  snprintf(commandTopic, sizeof(commandTopic), TOPIC_PUMP_COMMAND, DEVICE_CODE);
  _mqtt->subscribe(commandTopic, QOS_COMMAND);
  Serial.printf("[MQTT] Subscribed: %s\n", commandTopic);

  char resetTopic[64];
  snprintf(resetTopic, sizeof(resetTopic), TOPIC_RESET_COMMAND, DEVICE_CODE);
  _mqtt->subscribe(resetTopic, QOS_COMMAND);
  Serial.printf("[MQTT] Subscribed: %s\n", resetTopic);

  Serial.println("=== Pump Ready ===");
}

// ── Main loop ──────────────────────────────────────────────────────────────────
void loop() {
  _wifi.handleProvisioning();

  if (!_wifi.isConnected()) return;
  _espnow.loop();
  _mqtt->loop();

  // Auto-stop when duration expires
  if (_pumpRunning && _pumpDuration > 0) {
    uint32_t elapsed = (millis() - _pumpStartTime) / 1000;
    if (elapsed >= _pumpDuration) {
      digitalWrite(RELAY_PIN, HIGH);
      _pumpRunning = false;
      Serial.println("[PUMP] Auto-stopped");
      publishStatus();
    }
  }

  static uint32_t lastStatus = 0;
  uint32_t now = millis();
  if (now - lastStatus > STATUS_PUBLISH_INTERVAL_MS) {
    publishStatus();
    lastStatus = now;
  }
}

// ── Status ─────────────────────────────────────────────────────────────────────
void publishStatus() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  char topic[64], payload[256];
  snprintf(topic, sizeof(topic), TOPIC_PUMP_STATUS, DEVICE_CODE);

  uint32_t remaining = 0;
  if (_pumpRunning && _pumpDuration > 0) {
    uint32_t elapsed = (millis() - _pumpStartTime) / 1000;
    remaining = _pumpDuration - min(elapsed, _pumpDuration);
  }

  snprintf(payload, sizeof(payload),
    "{\"running\":%s,\"remaining\":%u,\"cmd_id\":\"%s\"}",
    _pumpRunning ? "true" : "false",
    remaining,
    _currentCmdId[0] ? _currentCmdId : "");

  _mqtt->publish(topic, payload, true);  // retained
  Serial.printf("[MQTT] Status: %s\n", payload);
}

void sendAck(const char* cmdId) {
  if (!cmdId[0]) return;

  char topic[64], payload[256];
  snprintf(topic, sizeof(topic), TOPIC_PUMP_ACK, DEVICE_CODE);
  snprintf(payload, sizeof(payload),
    "{\"cmd_id\":\"%s\",\"accepted\":true}", cmdId);

  _mqtt->publish(topic, payload, (uint8_t)QOS_COMMAND);
  Serial.printf("[MQTT] ACK sent: %s\n", payload);
}