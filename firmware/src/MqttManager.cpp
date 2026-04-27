#include "MqttManager.h"

MqttManager::MqttManager(Client& client, const char* deviceCode)
  : _client(client), _reconnectInterval(MQTT_RECONNECT_INITIAL_MS), _shouldReconnect(false) {
  strncpy(_deviceCode, deviceCode, sizeof(_deviceCode) - 1);
  _client.setBufferSize(MQTT_BUFFER_SIZE);
}

bool MqttManager::connect() {
  // Generate client ID with device code prefix
  char clientId[64];
  snprintf(clientId, sizeof(clientId), "smartgarden-%s", _deviceCode);

  // Attempt connection
  if (_client.connect(clientId, nullptr, nullptr, TOPIC_BASE "/device/lwt", 1, true, "{\"status\":\"offline\"}")) {
    _reconnectInterval = MQTT_RECONNECT_INITIAL_MS;
    Serial.printf("[MQTT] Connected as %s\n", clientId);
    return true;
  }

  Serial.printf("[MQTT] Connect failed, rc=%d\n", _client.state());
  return false;
}

void MqttManager::disconnect() {
  _client.disconnect();
  Serial.println("[MQTT] Disconnected");
}

void MqttManager::reconnect() {
  if (_client.connected()) return;

  Serial.printf("[MQTT] Reconnecting in %ums...\n", _reconnectInterval);
  delay(_reconnectInterval);

  if (connect()) return;

  // Exponential backoff: 1s → 2s → 4s → 8s → ... → 60s
  _reconnectInterval = min(_reconnectInterval * 2, MQTT_RECONNECT_MAX_MS);
}

bool MqttManager::publish(const char* topic, const char* payload, bool retained) {
  if (!_client.connected()) {
    reconnect();
    if (!_client.connected()) return false;
  }

  return _client.publish(topic, payload, retained);
}

bool MqttManager::subscribe(const char* topic, uint8_t qos) {
  if (!_client.connected()) {
    reconnect();
    if (!_client.connected()) return false;
  }

  return _client.subscribe(topic, qos);
}

void MqttManager::loop() {
  if (!_client.connected()) {
    reconnect();
    return;
  }

  _client.loop();
}

void MqttManager::setCallback(MQTT_CALLBACK_SIGNATURE) {
  _client.setCallback(callback);
}

void MqttManager::setLWT(const char* topic, const char* payload) {
  // LWT is set in connect() call above
  (void)topic;
  (void)payload;
  // Note: PubSubClient sets LWT in the connect() call
}