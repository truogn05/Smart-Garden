#include "WifiProvisioner.h"
#include <WebServer.h>

static WebServer server(80);
static WifiProvisioner* _instance = nullptr;

WifiProvisioner::WifiProvisioner(const char* apName) {
  strncpy(_apName, apName, sizeof(_apName) - 1);
  _apName[sizeof(_apName) - 1] = '\0';
  _provisioning = false;
  _instance = this;
}

bool WifiProvisioner::begin() {
  // Try to load stored credentials
  if (!loadFromStorage()) {
    Serial.println("[WiFi] No stored credentials, starting AP mode");
    startAP();
    return false;
  }

  Serial.printf("[WiFi] Connecting to stored SSID: %s\n", _ssid.c_str());
  return connectWithTimeout();
}

void WifiProvisioner::startAP() {
  _provisioning = true;

  WiFi.mode(WIFI_AP);
  WiFi.softAP(_apName);

  IPAddress apIP = WiFi.softAPIP();
  Serial.printf("[WiFi] AP Mode started\n");
  Serial.printf("[WiFi] AP IP: %s\n", apIP.toString().c_str());
  Serial.printf("[WiFi] Connect to '%s' and visit http://%s\n", _apName, apIP.toString().c_str());

  // Serve provisioning form
  server.on("/", HTTP_GET, []() {
    String html = R"(
      <!DOCTYPE html>
      <html>
      <head>
        <title>SmartGarden WiFi Setup</title>
        <meta name='viewport' content='width=device-width, initial-scale=1'>
        <style>
          body { font-family: sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; }
          input { width: 100%; padding: 8px; margin: 8px 0; box-sizing: border-box; }
          button { background: #4CAF50; color: white; padding: 10px 20px; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <h2>SmartGarden WiFi Setup</h2>
        <form action='/save' method='POST'>
          <input name='ssid' placeholder='WiFi SSID' required>
          <input name='password' type='password' placeholder='WiFi Password' required>
          <button type='submit'>Save & Connect</button>
        </form>
      </body>
      </html>
    )";
    server.send(200, "text/html", html);
  });

  server.on("/save", HTTP_POST, []() {
    if (!server.hasArg("ssid") || !server.hasArg("password")) {
      server.send(400, "text/plain", "Missing SSID or password");
      return;
    }

    String ssid = server.arg("ssid");
    String password = server.arg("password");

    if (_instance && _instance->saveCredentials(ssid.c_str(), password.c_str())) {
      server.send(200, "text/plain", "Credentials saved! Device restarting...");
      delay(1000);
      ESP.restart();  // Only restart on explicit user provisioning
    } else {
      server.send(500, "text/plain", "Failed to save credentials");
    }
  });

  server.begin();
  Serial.println("[WiFi] Provisioning server started");
}

void WifiProvisioner::handleProvisioning() {
  if (_provisioning) {
    server.handleClient();
  }
}

bool WifiProvisioner::saveCredentials(const char* ssid, const char* password) {
  _prefs.begin("smartgarden", false);

  bool ok = _prefs.putString("ssid", ssid) > 0;
  ok = ok && _prefs.putString("password", password) > 0;

  _prefs.end();

  if (ok) {
    _ssid = ssid;
    _password = password;
    Serial.printf("[WiFi] Saved credentials for SSID: %s\n", ssid);
  }

  return ok;
}

void WifiProvisioner::clearCredentials() {
  _prefs.begin("smartgarden", false);
  _prefs.clear();
  _prefs.end();
  _ssid = "";
  _password = "";
  Serial.println("[WiFi] Cleared stored credentials");
}

bool WifiProvisioner::loadFromStorage() {
  _prefs.begin("smartgarden", true);

  _ssid = _prefs.getString("ssid", "");
  _password = _prefs.getString("password", "");

  _prefs.end();

  if (_ssid.length() == 0) {
    return false;
  }

  Serial.printf("[WiFi] Loaded credentials for SSID: %s\n", _ssid.c_str());
  return true;
}

bool WifiProvisioner::connectWithTimeout(uint32_t timeoutMs) {
  WiFi.mode(WIFI_STA);
  WiFi.begin(_ssid.c_str(), _password.c_str());

  uint32_t start = millis();
  while (WiFi.status() != WL_CONNECTED && (millis() - start) < timeoutMs) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("\n[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    return true;
  }

  Serial.println("\n[WiFi] Connection failed");
  return false;
}