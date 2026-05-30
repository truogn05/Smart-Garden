#ifndef ESPNOW_MANAGER_H
#define ESPNOW_MANAGER_H

#include <Arduino.h>
#include <esp_now.h>
#include <WiFi.h>

// ESP-NOW broadcast address
static const uint8_t ESPNOW_BROADCAST_ADDR[] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};

/**
 * ESP-NOW manager for SmartGarden provisioning.
 *
 * Pump (master): broadcasts WiFi credentials to all listening sensors.
 *  - Broadcasts 3 times with 1s intervals
 *  - Waits for ACK/NACK from sensor
 *  - Retries up to ESPNOW_MAX_RETRIES cycles
 *
 * Sensor (slave): listens for WiFi credentials from pump.
 *  - Registers receive callback
 *  - On receive: saves credentials, sends ACK back to sender
 */
class EspNowManager {
public:
  // Returns true on success
  bool begin(bool asMaster);

  // Pump only: broadcast credentials, return true if ACK received
  bool broadcastCredentials(const char* ssid, const char* password);

  // Sensor only: register callback when WiFi creds received
  void onCredentialsReceived(void (*cb)(const char* ssid, const char* password));

  // Loop: call from main loop for non-blocking operations
  void loop();

  bool isConnected() const { return _connected; }
  bool isSending() const { return _sending; }

private:
  bool _isMaster = false;
  bool _connected = false;
  bool _sending = false;
  uint8_t _retryCycle = 0;

  // TX callback result tracking
  static bool _ackReceived;
  static uint32_t _ackDeadline;

  static void (*_credentialsCallback)(const char* ssid, const char* password);

  static void onSend(const uint8_t* macAddr, esp_now_send_status_t status);
  static void onReceive(const uint8_t* mac, const uint8_t* data, int len);
};

#endif // ESPNOW_MANAGER_H