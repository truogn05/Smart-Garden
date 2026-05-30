#include "EspNowManager.h"
#include "Config.h"

bool EspNowManager::_ackReceived = false;
uint32_t EspNowManager::_ackDeadline = 0;
void (*EspNowManager::_credentialsCallback)(const char* ssid, const char* password) = nullptr;

bool EspNowManager::begin(bool asMaster) {
  _isMaster = asMaster;

  if (esp_now_init() != ESP_OK) {
    Serial.println("[ESPNOW] Init failed");
    return false;
  }

  esp_now_register_send_cb(onSend);
  esp_now_register_recv_cb(onReceive);

  if (asMaster) {
    // Register peer (sensor) — use broadcast address for initial pairing
    // In practice, sensor MAC is known or learned; use wildcard for demo
    esp_now_peer_info_t peer = {};
    memcpy(peer.peer_addr, ESPNOW_BROADCAST_ADDR, 6);
    peer.channel = ESPNOW_CHANNEL;
    peer.ifidx = WIFI_IF_STA;
    peer.encrypt = false;
    esp_now_add_peer(&peer);
  }

  _connected = true;
  Serial.printf("[ESPNOW] Init OK (%s mode)\n", asMaster ? "master" : "slave");
  return true;
}

bool EspNowManager::broadcastCredentials(const char* ssid, const char* password) {
  if (!_connected || !_isMaster) return false;

  // Pack credentials into payload
  char payload[128];
  snprintf(payload, sizeof(payload), "SG|%s|%s", ssid, password);

  _retryCycle = 0;
  _ackReceived = false;

  for (int cycle = 0; cycle < ESPNOW_MAX_RETRIES && !_ackReceived; cycle++) {
    _retryCycle = cycle + 1;
    Serial.printf("[ESPNOW] Broadcast attempt %d/3...\n", _retryCycle);

    esp_err_t err = esp_now_send(ESPNOW_BROADCAST_ADDR, (uint8_t*)payload, strlen(payload));
    if (err != ESP_OK) {
      Serial.printf("[ESPNOW] Send error: %d\n", err);
      continue;
    }

    // Wait for ACK with timeout (1 broadcast + 500ms window)
    _ackDeadline = millis() + ESPNOW_SEND_DELAY + 500;
    while (!_ackReceived && millis() < _ackDeadline) {
      loop();
      delay(50);
    }

    if (_ackReceived) {
      Serial.println("[ESPNOW] ACK received — provisioning complete");
      return true;
    }

    // Wait before next cycle
    delay(ESPNOW_SEND_DELAY);
  }

  Serial.println("[ESPNOW] No ACK after 3 retries — provisioning failed");
  return false;
}

void EspNowManager::onCredentialsReceived(
    void (*cb)(const char* ssid, const char* password)) {
  _credentialsCallback = cb;
}

void EspNowManager::loop() {
  // Non-blocking: handle any pending ESP-NOW events
}

void EspNowManager::onSend(const uint8_t* macAddr, esp_now_send_status_t status) {
  (void)macAddr;
  if (status == ESP_NOW_SEND_SUCCESS) {
    Serial.println("[ESPNOW] TX OK");
  } else {
    Serial.println("[ESPNOW] TX FAIL");
  }
}

void EspNowManager::onReceive(const uint8_t* mac, const uint8_t* data, int len) {
  (void)mac;

  if (len < 3 || data == nullptr) return;

  // Check for SmartGarden credential packet
  if (data[0] == 'S' && data[1] == 'G' && data[2] == '|') {
    // Parse "SG|ssid|password"
    char buf[128] = {0};
    memcpy(buf, data, min<int>(len, (int)sizeof(buf) - 1));

    char* sep1 = strchr(buf + 3, '|');
    if (!sep1) return;
    *sep1 = '\0';

    char* sep2 = strchr(sep1 + 1, '|');
    if (!sep2) return;
    *sep2 = '\0';

    const char* ssid = buf + 3;
    const char* password = sep1 + 1;

    Serial.printf("[ESPNOW] Received credentials: SSID=%s\n", ssid);

    if (_credentialsCallback) {
      _credentialsCallback(ssid, password);
    }

    // Send ACK back to sender
    char ack[16];
    snprintf(ack, sizeof(ack), "ACK|%s", DEVICE_CODE);
    esp_now_send(mac, (uint8_t*)ack, strlen(ack));
    Serial.println("[ESPNOW] ACK sent");
  }

  // Check for ACK from sensor (pump receives this)
  if (len >= 4 && data[0] == 'A' && data[1] == 'C' && data[2] == 'K') {
    Serial.println("[ESPNOW] Sensor ACK received!");
    _ackReceived = true;
  }

  // Check for NACK
  if (len >= 5 && data[0] == 'N' && data[1] == 'A' && data[2] == 'C' && data[3] == 'K') {
    Serial.println("[ESPNOW] Sensor NACK received");
    _ackReceived = false;
  }
}