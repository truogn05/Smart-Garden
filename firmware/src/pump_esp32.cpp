#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include "Config.h"
#include "MqttManager.h"

// Hardware: Relay on GPIO26 (active LOW)
#define RELAY_PIN 26

// Global instance
WiFiClient _wifiClient;
MqttManager* _mqtt = nullptr;

// State
bool _pumpRunning = false;
uint32_t _pumpStartTime = 0;
uint32_t _pumpDuration = 0;
char _currentCmdId[32] = {0};

// Forward declarations
void setupWiFi();
void setupMQTT();
void handlePumpCommand(char* payload);
void publishStatus();
void callback(char* topic, uint8_t* payload, unsigned int length);

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== SmartGarden Pump ESP32 ===");
  Serial.printf("Device Type: %s\n", DEVICE_TYPE);

  // Set device code from MAC address
  char deviceCode[32];
  uint8_t mac[6];
  WiFi.macAddress(mac);
  snprintf(deviceCode, sizeof(deviceCode), "PUMP_%02X%02X%02X", mac[3], mac[4], mac[5]);

  // Initialize relay pin
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);  // Relay OFF (active LOW)

  // Setup subsystems
  setupWiFi();

  _mqtt = new MqttManager(_wifiClient, deviceCode);
  _mqtt->setCallback(callback);
  setupMQTT();

  Serial.println("=== Pump Ready ===");
}

void loop() {
  // Ensure WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Reconnecting...");
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // MQTT loop
  if (_mqtt) {
    _mqtt->loop();

    // Handle pump timing
    if (_pumpRunning && _pumpDuration > 0) {
      uint32_t elapsed = (millis() - _pumpStartTime) / 1000;
      if (elapsed >= _pumpDuration) {
        // Auto stop
        digitalWrite(RELAY_PIN, HIGH);  // OFF
        _pumpRunning = false;
        Serial.println("[PUMP] Auto-stopped");
        publishStatus();
      }
    }
  }
}

// WiFi setup with retry
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
  } else {
    Serial.println("\n[WIFI] Failed, retrying in loop...");
  }
}

// MQTT subscribe to command topic
void setupMQTT() {
  if (_mqtt) {
    char topic[64];
    snprintf(topic, sizeof(topic), "%s/%s/pump/command", TOPIC_BASE, _mqtt->getDeviceCode());

    // Subscribe to device-specific command topic AND wildcard for updates
    _mqtt->subscribe("smartgarden/+/pump/command", QOS_COMMAND);

    Serial.printf("[MQTT] Subscribed to: %s\n", topic);
  }
}

// Handle incoming MQTT message
void callback(char* topic, uint8_t* payload, unsigned int length) {
  // Null-terminate the payload
  payload[length] = '\0';

  Serial.printf("[MQTT] Received on %s: %s\n", topic, (char*)payload);

  // Parse JSON (simplified - use ArduinoJson in production)
  // Expected: {"action": "start"|"stop", "duration": 120, "cmd_id": "abc123"}

  if (strstr((char*)payload, "\"action\":\"start\"") != nullptr) {
    // Parse duration
    char* durPtr = strstr((char*)payload, "\"duration\":");
    if (durPtr) {
      _pumpDuration = atoi(durPtr + 10);
    }

    // Extract cmd_id
    char* cmdIdPtr = strstr((char*)payload, "\"cmd_id\":\"");
    if (cmdIdPtr) {
      char* end = strchr(cmdIdPtr + 9, '"');
      if (end) *end = '\0';
      strncpy(_currentCmdId, cmdIdPtr + 9, sizeof(_currentCmdId) - 1);
    }

    // Start pump
    digitalWrite(RELAY_PIN, LOW);  // ON (active LOW)
    _pumpRunning = true;
    _pumpStartTime = millis();

    Serial.printf("[PUMP] Started for %us\n", _pumpDuration);
    publishStatus();
  }
  else if (strstr((char*)payload, "\"action\":\"stop\"") != nullptr) {
    digitalWrite(RELAY_PIN, HIGH);  // OFF
    _pumpRunning = false;
    Serial.println("[PUMP] Stopped");
    publishStatus();
  }
}

// Publish pump status to broker
void publishStatus() {
  if (!_mqtt || !_mqtt->isConnected()) return;

  char topic[64];
  char payload[256];

  snprintf(topic, sizeof(topic), "%s/%s/pump/status", TOPIC_BASE, _mqtt->getDeviceCode());

  uint32_t remaining = 0;
  if (_pumpRunning && _pumpDuration > 0) {
    remaining = _pumpDuration - ((millis() - _pumpStartTime) / 1000);
  }

  snprintf(payload, sizeof(payload),
    "{\"running\":%s,\"remaining\":%u,\"cmd_id\":\"%s\"}",
    _pumpRunning ? "true" : "false",
    remaining,
    _currentCmdId);

  _mqtt->publish(topic, payload, true);  // Retained

  // Also send ACK if we have a cmd_id
  if (_currentCmdId[0]) {
    snprintf(topic, sizeof(topic), "%s/%s/pump/ack", TOPIC_BASE, _mqtt->getDeviceCode());
    snprintf(payload, sizeof(payload),
      "{\"cmd_id\":\"%s\",\"accepted\":true}", _currentCmdId);
    _mqtt->publish(topic, payload, false);
  }
}