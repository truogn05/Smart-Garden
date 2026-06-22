#ifndef CONFIG_H
#define CONFIG_H

#include <Arduino.h>

// ============================================================
// WiFi Configuration
// Override with build_flags: -DWIFI_SSID='"MyNetwork"' -DWIFI_PASSWORD='"MyPass"'
// ============================================================
#ifndef WIFI_SSID
#define WIFI_SSID "P108A"
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD "88888888"
#endif

// ============================================================
// MQTT Configuration — HiveMQ Cloud (TLS + username/password)
// Override with build_flags:
//   -DMQTT_BROKER='"xxx.s1.eu.hivemq.cloud"'
//   -DMQTT_USERNAME='"user"'
//   -DMQTT_PASSWORD='"pass"'
// ============================================================
#ifndef MQTT_BROKER
#define MQTT_BROKER "YOUR_BROKER_ID.s1.eu.hivemq.cloud"
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 8883
#endif

#ifndef MQTT_USERNAME
#define MQTT_USERNAME "YOUR_MQTT_USERNAME"
#endif

#ifndef MQTT_PASSWORD
#define MQTT_PASSWORD "YOUR_MQTT_PASSWORD"
#endif

#ifndef MQTT_CLIENT_ID_PREFIX
#define MQTT_CLIENT_ID_PREFIX "smartgarden-"
#endif

// ============================================================
// Device Code — set via platformio.ini:
//   -DDEVICE_CODE=\"SENSOR_001\"  or  -DDEVICE_CODE=\"PUMP_001\"
// ============================================================
#ifndef DEVICE_CODE
#define DEVICE_CODE "UNKNOWN"
#endif

// ============================================================
// MQTT Topics (use with snprintf — each is a %s-compatible format string)
// ============================================================
#define TOPIC_BASE "smartgarden"

// Full topic strings: use snprintf(topic, sizeof(topic), MACRO, DEVICE_CODE)
// e.g. snprintf(topic, sizeof(topic), TOPIC_WEATHER, DEVICE_CODE)
#define TOPIC_WEATHER       "smartgarden/%s/sensor/weather"
#define TOPIC_SOIL          "smartgarden/%s/sensor/soil"
#define TOPIC_AI_DRYOUT     "smartgarden/%s/ai/dryout"
#define TOPIC_PUMP_STATUS   "smartgarden/%s/pump/status"
#define TOPIC_PUMP_ACK      "smartgarden/%s/pump/ack"
#define TOPIC_PUMP_COMMAND  "smartgarden/%s/pump/command"
#define TOPIC_RESET_COMMAND "smartgarden/%s/reset/command"
#define TOPIC_HEARTBEAT     "smartgarden/%s/heartbeat"
#define TOPIC_LWT           "smartgarden/%s/lwt"
#define TOPIC_PROVISION_WIFI "smartgarden/provision/wifi"

// Pump command wildcard (pump subscribes to this)
#define TOPIC_PUMP_COMMAND_WILDCARD TOPIC_BASE "/+/pump/command"

// ============================================================
// QoS Levels
// ============================================================
#define QOS_TELEMETRY 0
#define QOS_COMMAND   1

// ============================================================
// Timing (milliseconds)
// ============================================================
#define MQTT_RECONNECT_INITIAL_MS  1000
#define MQTT_RECONNECT_MAX_MS      60000
#define SENSOR_READ_INTERVAL_MS    10000   // 10 sec (temporary for testing)
#define HEARTBEAT_INTERVAL_MS      300000   // 5 min
#define DRYOUT_PREDICT_INTERVAL_MS 600000   // 10 min
#define STATUS_PUBLISH_INTERVAL_MS  60000   // 1 min
#define AI_SAVE_INTERVAL_MS        600000   // 10 min

// Fast-fail: enter AP mode after N ms if WiFi doesn't connect (demo mode)
#ifndef WIFI_CONNECT_TIMEOUT_MS
#define WIFI_CONNECT_TIMEOUT_MS 5000
#endif

// ============================================================
// Buffer Sizes
// ============================================================
#define MQTT_BUFFER_SIZE  1024
#define JSON_DOC_SIZE     512

// ============================================================
// Hardware Pins — Sensor Board
// Override with build_flags if needed: -DDHT_PIN=21
// ============================================================
#ifndef DHT_PIN
#define DHT_PIN 14
#endif
#define DHT_TYPE DHT11

#ifndef SOIL_ADC_PIN
#define SOIL_ADC_PIN 32
#endif

#ifndef RAIN_ADC_PIN
#define RAIN_ADC_PIN 34
#endif

#ifndef RAIN_DIGITAL_PIN
#define RAIN_DIGITAL_PIN 35
#endif

// ============================================================
// Hardware Pins — Pump Board
// ============================================================
#ifndef RELAY_PIN
#define RELAY_PIN 26
#endif

// ============================================================
// ADC Averaging
// ============================================================
#define ADC_SAMPLES 64
#define ADC_MAX     4095

// ============================================================
// ESP-NOW (pump → sensor provisioning)
// ============================================================
#define ESPNOW_CHANNEL      1
#define ESPNOW_SEND_DELAY   1000    // ms between broadcasts
#define ESPNOW_MAX_RETRIES  3

// ============================================================
// AI Model Defaults (DryoutPredictor — 28 bytes total)
// ============================================================
#define DRYOUT_BIAS_DEFAULT     8.0f
#define DRYOUT_W_SOIL_DEFAULT   0.15f
#define DRYOUT_W_TEMP_DEFAULT   0.12f
#define DRYOUT_W_HUM_DEFAULT    0.05f
#define DRYOUT_W_RAIN_DEFAULT   0.08f
#define DRYOUT_W_TIME_DEFAULT   0.02f
#define DRYOUT_W_LAST_DEFAULT   0.03f
#define DRYOUT_LR_DEFAULT       0.001f
#define DRYOUT_MIN_HOURS        1.0f
#define DRYOUT_MAX_HOURS        72.0f

#endif // CONFIG_H