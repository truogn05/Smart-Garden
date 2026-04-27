#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFiClient.h>
#include "Config.h"

class MqttManager {
public:
  MqttManager(Client& client, const char* deviceCode);

  // Connect to MQTT broker with exponential backoff
  bool connect();
  void disconnect();

  // Reconnection with exponential backoff (no restart!)
  void reconnect();

  // Publish a message
  bool publish(const char* topic, const char* payload, bool retained = false);

  // Subscribe to a topic
  bool subscribe(const char* topic, uint8_t qos = 0);

  // Process MQTT loop
  void loop();

  // Check if connected
  bool isConnected() const { return _client.connected(); }

  // Get the device code
  const char* getDeviceCode() const { return _deviceCode; }

  // Set callback for incoming messages
  void setCallback(MQTT_CALLBACK_SIGNATURE);

  // Set last will and testament
  void setLWT(const char* topic, const char* payload);

  // Get client for external use
  PubSubClient& getClient() { return _client; }

private:
  PubSubClient _client;
  char _deviceCode[32];
  uint32_t _reconnectInterval;
  bool _shouldReconnect;

  // Parse device code from topic
  static void extractDeviceCode(const char* topic, char* dest, size_t destSize);
};

#endif // MQTT_MANAGER_H