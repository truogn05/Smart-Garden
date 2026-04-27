#ifndef WIFI_PROVISIONER_H
#define WIFI_PROVISIONER_H

#include <Arduino.h>
#include <WiFi.h>
#include <Preferences.h>

/**
 * Handles WiFi credential storage and provisioning.
 * Stores SSID/password in ESP32 Preferences (non-volatile storage).
 * If no credentials stored, starts AP mode for provisioning.
 */
class WifiProvisioner {
public:
  WifiProvisioner(const char* apName = "SmartGarden-Setup");

  // Load credentials from storage, connect if available
  bool begin();

  // Start AP mode for provisioning (serve a simple form)
  void startAP();

  // Handle provisioning requests (call in loop if in AP mode)
  void handleProvisioning();

  // Check if provisioning mode is active
  bool isProvisioning() const { return _provisioning; }

  // Save credentials
  bool saveCredentials(const char* ssid, const char* password);

  // Clear stored credentials
  void clearCredentials();

  // Get stored SSID
  String getSSID() const { return _ssid; }

  // Get stored password
  String getPassword() const { return _password; }

private:
  char _apName[32];
  String _ssid;
  String _password;
  bool _provisioning;
  Preferences _prefs;

  // Load from Preferences
  bool loadFromStorage();

  // Connect with timeout
  bool connectWithTimeout(uint32_t timeoutMs = 30000);
};

#endif // WIFI_PROVISIONER_H