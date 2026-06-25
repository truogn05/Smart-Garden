#ifndef WIFI_PROVISIONER_H
#define WIFI_PROVISIONER_H

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>
#include <functional>

// Callback when MQTT reset command is received
typedef std::function<void()> ResetCallback;

/**
 * Handles WiFi credential storage and provisioning.
 *
 * Boot sequence:
 *  1. Load stored credentials from Preferences
 *  2. Attempt WiFi connection with fast-fail timeout (5s demo mode)
 *  3. If connected → normal operation
 *  4. If failed → start AP mode with /reset page
 *
 * AP mode serves:
 *  - GET /         → WiFi provisioning form
 *  - POST /save    → save credentials, reboot
 *  - GET /reset    → WiFi reset form (clears credentials, reboots)
 *
 * Remote reset via MQTT:
 *  - subscribe to TOPIC_DEVICE_RESET_COMMAND
 *  - when received: clearCredentials() + ESP.restart()
 */
class WifiProvisioner {
public:
  WifiProvisioner(const char* apName = "SmartGarden");

  // Load credentials and attempt connection.
  // Returns true if WiFi is connected, false if entered AP mode.
  bool begin();

  // Call in loop() when in AP mode (no-op when connected)
  void handleProvisioning();

  // True when AP mode is active (awaiting credentials)
  bool isProvisioning() const { return _provisioning; }

  // True when WiFi is connected
  bool isConnected() const { return _wifiConnected; }

  // Save credentials from web form
  bool saveCredentials(const char* ssid, const char* password, const char* mqttHost);

  // Clear stored credentials (call before ESP.restart())
  void clearCredentials();

  // Trigger reset from MQTT callback. Returns true if credentials were cleared.
  bool triggerReset();

  // Register callback for remote reset command
  void onReset(ResetCallback cb) { _resetCallback = cb; }

  String getSSID() const { return _ssid; }
  String getPassword() const { return _password; }
  String getMqttHost() const { return _mqttHost; }
  String getAPName() const { return String(_apName); }
  IPAddress getAPIP() const { return WiFi.softAPIP(); }

  void updateAPState(bool mqttConnected);

private:
  char _apName[32];
  String _ssid;
  String _password;
  String _mqttHost;
  bool _provisioning;
  bool _wifiConnected;
  Preferences _prefs;
  ResetCallback _resetCallback;

  uint32_t _apStartTime;
  uint32_t _apTimeout;
  bool _apTimerStarted;

  bool loadFromStorage();
  bool connectWithFastFail();
  void startAP();
  void stopAP();
};

#endif // WIFI_PROVISIONER_H