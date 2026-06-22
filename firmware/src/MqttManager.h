#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <Arduino.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <functional>
#include "Config.h"

#undef MQTT_CALLBACK_SIGNATURE
#define MQTT_CALLBACK_SIGNATURE std::function<void(char*, uint8_t*, unsigned int)>

class MqttManager {
public:
  MqttManager(const char* deviceCode);
  void setServer(const char* host, uint16_t port);

  bool connect();
  void disconnect();
  void reconnect();
  bool publish(const char* topic, const char* payload, bool retained = false);
  bool publish(const char* topic, const char* payload, uint8_t qos, bool retained = false);
  bool subscribe(const char* topic, uint8_t qos = 0);
  void loop();
  bool isConnected() { return _client.connected(); }
  const char* getDeviceCode() const { return _deviceCode; }
  void setCallback(MQTT_CALLBACK_SIGNATURE);
  PubSubClient& getClient() { return _client; }

private:
  // Use WiFiClientSecure for TLS (HiveMQ Cloud), WiFiClient for plain TCP (local Mosquitto)
#ifndef MQTT_USE_TLS
  WiFiClient _wifiClient;
#else
  WiFiClientSecure _wifiClient;
#endif
  PubSubClient _client;
  char _deviceCode[32];
  char _brokerHost[64];
  uint16_t _brokerPort;
  uint32_t _reconnectInterval;
};

#endif // MQTT_MANAGER_H