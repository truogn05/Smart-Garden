#include "MqttManager.h"

MqttManager::MqttManager(const char* deviceCode)
  : _client(_wifiClient), _reconnectInterval(MQTT_RECONNECT_INITIAL_MS) {
  strncpy(_deviceCode, deviceCode, sizeof(_deviceCode) - 1);
  _deviceCode[sizeof(_deviceCode) - 1] = '\0';

  _client.setBufferSize(MQTT_BUFFER_SIZE);
  _client.setKeepAlive(15);

#ifdef MQTT_USE_TLS
  // HiveMQ Cloud: TLS required
  _wifiClient.setInsecure();  // HiveMQ uses a wildcard cert per region
#endif
}

bool MqttManager::connect() {
  char clientId[64];
  snprintf(clientId, sizeof(clientId), "%s%s", MQTT_CLIENT_ID_PREFIX, _deviceCode);

#ifdef MQTT_USE_TLS
  Serial.printf("[MQTT] Connecting (TLS) to %s:%d as %s\n", MQTT_BROKER, MQTT_PORT, clientId);
#else
  Serial.printf("[MQTT] Connecting (plain) to %s:%d as %s\n", MQTT_BROKER, MQTT_PORT, clientId);
#endif

  char lwtTopic[64];
  snprintf(lwtTopic, sizeof(lwtTopic), TOPIC_LWT, _deviceCode);

#ifdef MQTT_USE_TLS
  if (_client.connect(clientId, MQTT_USERNAME, MQTT_PASSWORD,
      lwtTopic, 1, true, "{\"status\":\"offline\"}")) {
#else
  // Local Mosquitto: no auth
  if (_client.connect(clientId)) {
#endif
    _reconnectInterval = MQTT_RECONNECT_INITIAL_MS;
    Serial.println("[MQTT] Connected");
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

  _reconnectInterval = min<uint32_t>(_reconnectInterval * 2, MQTT_RECONNECT_MAX_MS);
}

bool MqttManager::publish(const char* topic, const char* payload, bool retained) {
  return publish(topic, payload, QOS_TELEMETRY, retained);
}

bool MqttManager::publish(const char* topic, const char* payload, uint8_t qos, bool retained) {
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

void MqttManager::setCallback(MQTT_CALLBACK_SIGNATURE cb) {
  _client.setCallback(cb);
}