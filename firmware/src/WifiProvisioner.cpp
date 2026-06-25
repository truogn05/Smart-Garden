#include "WifiProvisioner.h"
#include "Config.h"
#include <WebServer.h>
#include <esp_wifi.h>

static WebServer _server(80);
static WifiProvisioner* _instance = nullptr;

WifiProvisioner::WifiProvisioner(const char* apName)
  : _provisioning(false), _wifiConnected(false), _resetCallback(nullptr),
    _apTimeout(0), _apTimerStarted(false) {
  strncpy(_apName, apName, sizeof(_apName) - 1);
  _apName[sizeof(_apName) - 1] = '\0';
  _instance = this;
}

// ── Entry point ────────────────────────────────────────────────────────────────

bool WifiProvisioner::begin() {
  if (loadFromStorage()) {
    Serial.printf("[WiFi] Stored SSID: %s — attempting connection...\n", _ssid.c_str());
    _wifiConnected = connectWithFastFail();
  } else {
    // Fallback to hardcoded credentials
    _ssid = WIFI_SSID;
    _password = WIFI_PASSWORD;
    _mqttHost = MQTT_BROKER;
    if (_ssid.length() > 0 && _ssid != "YOUR_WIFI_SSID") {
      Serial.printf("[WiFi] Using default SSID: %s — attempting connection...\n", _ssid.c_str());
      _wifiConnected = connectWithFastFail();
    }
  }

  Serial.printf("[WiFi] Starting AP '%s' alongside STA for 3-minute configuration window\n", _apName);
  startAP();
  return _wifiConnected;
}

// ── AP mode ───────────────────────────────────────────────────────────────────

void WifiProvisioner::startAP() {
  _provisioning = true;
  _apStartTime = millis();
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(_apName);
  delay(200);

  Serial.printf("[WiFi] AP '%s' started at http://%s\n",
                _apName, WiFi.softAPIP().toString().c_str());

  // ── Root: provisioning form ──────────────────────────────────────────────
  _server.on("/", HTTP_GET, []() {
    String apIP = WiFi.softAPIP().toString();
    String currentMqtt = _instance ? _instance->getMqttHost() : MQTT_BROKER;
    String currentSsid = _instance ? _instance->getSSID() : "";
    String currentPassword = _instance ? _instance->getPassword() : "";
    String passwordValue = currentPassword.length() > 0 ? "********" : "";
    String apTitle = _instance ? _instance->getAPName() + " Setup" : "SmartGarden Setup";
    String html = R"rawl(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; max-width: 420px; margin: 40px auto; padding: 20px; }
    h2 { color: #2e7d32; }
    input { width: 100%; padding: 10px; margin: 6px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
    button { width: 100%; padding: 12px; margin: 6px 0; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn-connect { background: #4CAF50; color: white; }
    .btn-reset { background: #f44336; color: white; }
    .status { padding: 10px; border-radius: 4px; margin: 10px 0; }
    .status-ok { background: #e8f5e9; color: #2e7d32; }
    .status-err { background: #ffebee; color: #c62828; }
  </style>
</head>
<body>
  <h2>)rawl" + apTitle + R"rawl(</h2>
  <form action="/save" method="POST" id="setupForm">
    <input name="ssid" placeholder="WiFi SSID" value=")rawl" + currentSsid + R"rawl(" required>
    <input name="password" type="password" placeholder="WiFi Password" value=")rawl" + passwordValue + R"rawl(">
    <input name="mqtt_host" placeholder="MQTT Broker IP" value=")rawl" + currentMqtt + R"rawl(" required>
    <button type="submit" class="btn-connect">Save & Connect</button>
  </form>
  <form action="/reset" method="GET">
    <button type="submit" class="btn-reset">Reset WiFi Credentials</button>
  </form>
</body>
</html>)rawl";
    _server.send(200, "text/html", html);
  });

  // ── POST /save: save credentials and reboot ───────────────────────────────
  _server.on("/save", HTTP_POST, []() {
    if (!_server.hasArg("ssid") || !_server.hasArg("password") || !_server.hasArg("mqtt_host")) {
      _server.send(400, "text/plain", "Missing fields");
      return;
    }
    String ssid = _server.arg("ssid");
    String password = _server.arg("password");
    String mqttHost = _server.arg("mqtt_host");
    if (_instance && _instance->saveCredentials(ssid.c_str(), password.c_str(), mqttHost.c_str())) {
      _server.send(200, "text/html",
        "<html><body><h2 style='color:#2e7d32'>Saved! Rebooting...</h2>"
        "<p>Device will connect to your WiFi shortly.</p></body></html>");
      delay(1500);
      ESP.restart();
    } else {
      _server.send(500, "text/plain", "Failed to save credentials");
    }
  });

  // ── GET /reset: reset form (same as root, pre-selected) ───────────────────
  _server.on("/reset", HTTP_GET, []() {
    String currentMqtt = _instance ? _instance->getMqttHost() : MQTT_BROKER;
    String currentSsid = _instance ? _instance->getSSID() : "";
    String currentPassword = _instance ? _instance->getPassword() : "";
    String passwordValue = currentPassword.length() > 0 ? "********" : "";
    String apTitle = _instance ? _instance->getAPName() + " Reset" : "Reset WiFi Credentials";
    String html = R"rawl(
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: sans-serif; max-width: 420px; margin: 40px auto; padding: 20px; }
    h2 { color: #f44336; }
    input { width: 100%; padding: 10px; margin: 6px 0; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; }
    button { width: 100%; padding: 12px; margin: 6px 0; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
    .btn-clear { background: #f44336; color: white; }
  </style>
</head>
<body>
  <h2>)rawl" + apTitle + R"rawl(</h2>
  <p>Enter new credentials below. Previous WiFi settings will be cleared.</p>
  <form action="/save" method="POST">
    <input name="ssid" placeholder="WiFi SSID" value=")rawl" + currentSsid + R"rawl(" required>
    <input name="password" type="password" placeholder="WiFi Password" value=")rawl" + passwordValue + R"rawl(">
    <input name="mqtt_host" placeholder="MQTT Broker IP" value=")rawl" + currentMqtt + R"rawl(" required>
    <button type="submit" class="btn-clear">Clear & Save New</button>
  </form>
</body>
</html>)rawl";
    _server.send(200, "text/html", html);
  });

  _server.begin();
}

// ── Loop handler (call in loop() when in AP mode) ─────────────────────────────

void WifiProvisioner::handleProvisioning() {
  if (_provisioning) {
    _server.handleClient();
  }
}

void WifiProvisioner::stopAP() {
  _provisioning = false;
  WiFi.softAPdisconnect(true);
  WiFi.mode(WIFI_STA);
  Serial.println("[WiFi] AP disabled, mode set to STA");
}

void WifiProvisioner::updateAPState(bool mqttConnected) {
  uint32_t now = millis();
  if (!mqttConnected) {
    // If MQTT is not connected, the AP MUST be on.
    if (!_provisioning) {
      Serial.println("[WiFi] MQTT disconnected — Reactivating AP");
      startAP();
    }
    _apTimerStarted = false;
  } else {
    // MQTT is connected. If AP is on, run the 3-minute countdown to turn it off.
    if (_provisioning) {
      if (!_apTimerStarted) {
        _apTimeout = now + 180000; // 3 minutes = 180,000 ms
        _apTimerStarted = true;
        Serial.printf("[WiFi] MQTT Connected! AP will remain active for 3 minutes (until %lu ms)\n", _apTimeout);
      } else if (now >= _apTimeout) {
        stopAP();
        _apTimerStarted = false;
      }
    }
  }
}

// ── Credentials storage ───────────────────────────────────────────────────────

bool WifiProvisioner::saveCredentials(const char* ssid, const char* password, const char* mqttHost) {
  _prefs.begin("smart-wifi", false);
  size_t ssidLen = _prefs.putString("ssid", ssid);
  String newPassword = password;
  if (newPassword == "********") {
    newPassword = _password;
  }
  size_t passLen = _prefs.putString("password", newPassword.c_str());
  size_t hostLen = _prefs.putString("mqtt_host", mqttHost);
  _prefs.end();

  bool ok = (ssidLen > 0);
  if (ok) {
    _ssid = ssid;
    _password = newPassword;
    _mqttHost = mqttHost;
    Serial.printf("[WiFi] Saved: SSID=%s, MQTT=%s\n", ssid, mqttHost);
  }
  return ok;
}

void WifiProvisioner::clearCredentials() {
  _prefs.begin("smart-wifi", false);
  _prefs.clear();
  _prefs.end();
  _ssid = "";
  _password = "";
  _mqttHost = "";
  _wifiConnected = false;
  Serial.println("[WiFi] Credentials cleared");
}

bool WifiProvisioner::triggerReset() {
  Serial.println("[WiFi] Remote reset triggered via MQTT");
  clearCredentials();
  if (_resetCallback) _resetCallback();
  delay(500);
  ESP.restart();  // Clear WiFi and re-enter AP mode
  return true;  // never reached
}

// ── Private helpers ───────────────────────────────────────────────────────────

bool WifiProvisioner::loadFromStorage() {
  _prefs.begin("smart-wifi", true);
  _ssid = _prefs.getString("ssid", "");
  _password = _prefs.getString("password", "");
  _mqttHost = _prefs.getString("mqtt_host", MQTT_BROKER);
  _prefs.end();
  return _ssid.length() > 0;
}

bool WifiProvisioner::connectWithFastFail() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(_ssid.c_str(), _password.c_str());

  uint32_t deadline = millis() + WIFI_CONNECT_TIMEOUT_MS;
  while (WiFi.status() != WL_CONNECTED && millis() < deadline) {
    delay(100);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected: %s (%ddBm)\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
    _wifiConnected = true;
    return true;
  }

  Serial.println("\n[WiFi] Fast-fail: connection timed out");
  WiFi.disconnect(false, true);  // erase config
  _wifiConnected = false;
  return false;
}