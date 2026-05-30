#include "WifiProvisioner.h"
#include "Config.h"
#include <WebServer.h>
#include <esp_wifi.h>

static WebServer _server(80);
static WifiProvisioner* _instance = nullptr;

WifiProvisioner::WifiProvisioner(const char* apName)
  : _provisioning(false), _wifiConnected(false), _resetCallback(nullptr) {
  strncpy(_apName, apName, sizeof(_apName) - 1);
  _apName[sizeof(_apName) - 1] = '\0';
  _instance = this;
}

// ── Entry point ────────────────────────────────────────────────────────────────

bool WifiProvisioner::begin() {
  if (loadFromStorage()) {
    Serial.printf("[WiFi] Stored SSID: %s — attempting connection...\n", _ssid.c_str());
    _wifiConnected = connectWithFastFail();
    if (_wifiConnected) return true;
  }

  Serial.println("[WiFi] No credentials or connect failed — starting AP mode");
  startAP();
  return false;
}

// ── AP mode ───────────────────────────────────────────────────────────────────

void WifiProvisioner::startAP() {
  _provisioning = true;
  WiFi.mode(WIFI_AP);
  WiFi.softAP(_apName);
  delay(200);

  Serial.printf("[WiFi] AP '%s' started at http://%s\n",
                _apName, WiFi.softAPIP().toString().c_str());

  // ── Root: provisioning form ──────────────────────────────────────────────
  _server.on("/", HTTP_GET, []() {
    String apIP = WiFi.softAPIP().toString();
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
  <h2>SmartGarden Setup</h2>
  <form action="/save" method="POST" id="setupForm">
    <input name="ssid" placeholder="WiFi SSID" required>
    <input name="password" type="password" placeholder="WiFi Password">
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
    if (!_server.hasArg("ssid") || !_server.hasArg("password")) {
      _server.send(400, "text/plain", "Missing SSID or password");
      return;
    }
    String ssid = _server.arg("ssid");
    String password = _server.arg("password");
    if (_instance && _instance->saveCredentials(ssid.c_str(), password.c_str())) {
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
  <h2>Reset WiFi Credentials</h2>
  <p>Enter new credentials below. Previous WiFi settings will be cleared.</p>
  <form action="/save" method="POST">
    <input name="ssid" placeholder="WiFi SSID" required>
    <input name="password" type="password" placeholder="WiFi Password" required>
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
  if (_provisioning) _server.handleClient();
}

// ── Credentials storage ───────────────────────────────────────────────────────

bool WifiProvisioner::saveCredentials(const char* ssid, const char* password) {
  _prefs.begin("smartgarden-wifi", false);
  bool ok = _prefs.putString("ssid", ssid) > 0
         && _prefs.putString("password", password) > 0;
  _prefs.end();

  if (ok) {
    _ssid = ssid;
    _password = password;
    Serial.printf("[WiFi] Saved: SSID=%s\n", ssid);
  }
  return ok;
}

void WifiProvisioner::clearCredentials() {
  _prefs.begin("smartgarden-wifi", false);
  _prefs.clear();
  _prefs.end();
  _ssid = "";
  _password = "";
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
  _prefs.begin("smartgarden-wifi", true);
  _ssid = _prefs.getString("ssid", "");
  _password = _prefs.getString("password", "");
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